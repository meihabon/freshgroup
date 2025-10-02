from fastapi import APIRouter, Depends, HTTPException, Query
from db import get_db_connection
from dependencies import get_current_user
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
import json
from typing import List, Dict
from utils import encode_features, describe_cluster, classify_location
router = APIRouter()


# ------------------------
# Helpers: normalize and safe encoding
# ------------------------
def _standard_col_name(name: str) -> str:
    """Return canonical lowercase name used internally."""
    return name.strip().lower()


# common variations mapping -> canonical column name used internally
_CANONICAL_MAP = {
    "sex": ["sex", "gender"],
    "program": ["program", "course"],
    "municipality": ["municipality", "city", "town"],
    "income": ["income", "family income", "family_income", "household_income"],
    "shs_type": ["shs_type", "shs type", "strand", "senior high", "shs"],
    "gwa": ["gwa", "general weighted average", "general_weighted_average", "general_weighted_average_gwa"],
    "name": ["name", "fullname", "student name", "student_name"],
}


def normalize_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create canonical column names if possible without destroying original columns.
    For each canonical field, if any variant exists in df.columns (case-insensitive)
    we create a canonical column (if not present) with that name (lowercase canonical).
    """
    df = df.copy()
    cols_lower = {c.lower(): c for c in df.columns}

    for canonical, variants in _CANONICAL_MAP.items():
        found = None
        for v in variants:
            if v.lower() in cols_lower:
                found = cols_lower[v.lower()]
                break
        if found:
            if canonical not in df.columns:
                df[canonical] = df[found]
        else:
            if canonical not in df.columns:
                df[canonical] = None

    return df


def encode_categorical_safe(df: pd.DataFrame, categorical_list: List[str]) -> pd.DataFrame:
    df = df.copy()
    for canonical in categorical_list:
        enc_col = f"{canonical}_enc"
        if canonical in df.columns:
            try:
                le = LabelEncoder()
                df[enc_col] = le.fit_transform(df[canonical].astype(str).fillna("Unknown"))
            except Exception:
                uniques = list(df[canonical].astype(str).fillna("Unknown").unique())
                mapping = {v: i for i, v in enumerate(uniques)}
                df[enc_col] = df[canonical].astype(str).fillna("Unknown").map(mapping)
    return df


def _pick_feature_columns(df: pd.DataFrame, canonical_features: List[str]) -> List[str]:
    out = []
    for feat in canonical_features:
        enc = f"{feat}_enc"
        if enc in df.columns:
            out.append(enc)
        elif feat in df.columns:
            out.append(feat)
    return out


# ------------------------
# GET OFFICIAL CLUSTERS
# ------------------------
@router.get("/clusters")
async def get_clusters(current_user: dict = Depends(get_current_user)):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT d.id as dataset_id, c.id as cluster_id, c.k, c.centroids 
        FROM datasets d 
        LEFT JOIN clusters c ON d.id = c.dataset_id 
        ORDER BY d.upload_date DESC LIMIT 1
    """)
    cluster_info = cursor.fetchone()

    if not cluster_info or not cluster_info.get("cluster_id"):
        cursor.close()
        connection.close()
        return {"clusters": {}, "plot_data": {}, "centroids": [], "cluster_labels": {}}

    cursor.execute("""
        SELECT s.*, sc.cluster_number
        FROM students s
        LEFT JOIN student_cluster sc ON s.id = sc.student_id
        WHERE s.dataset_id = %s
    """, (cluster_info["dataset_id"],))
    students = cursor.fetchall()

    cursor.close()
    connection.close()

    # Add LocationCategory (safe)
    for s in students:
        s["LocationCategory"] = classify_location(s.get("municipality"))

    # Convert to DataFrame for cluster description
    df = pd.DataFrame(students)

    # ensure lowercase consistent columns if some rows used uppercase
    # (map common uppercase keys to lowercase)
    if "GWA" in df.columns and "gwa" not in df.columns:
        df["gwa"] = df["GWA"]
    # same for SHS_type / shs_type if needed
    if "SHS_type" in df.columns and "shs_type" not in df.columns:
        df["shs_type"] = df["SHS_type"]

    # Optionally enrich / ensure derived features exist
    # (encode_features will add LocationCategory, IncomeCategory, Honors, program dummies)
    try:
        df = encode_features(df)
    except Exception:
        # fallback: continue with whatever is present
        pass

    # Ensure there's a numeric Cluster column used by describe_cluster
    if "cluster_number" in df.columns:
        df["Cluster"] = df["cluster_number"].astype(int)
    else:
        df["Cluster"] = df.get("Cluster", pd.Series([-1]*len(df))).astype(int)

    # Build descriptive labels using describe_cluster (which expects df["Cluster"])
    cluster_labels = {}
    if not df.empty:
        for c in sorted(df["Cluster"].unique()):
            cluster_labels[int(c)] = describe_cluster(df, int(c))
            df.loc[df["Cluster"] == c, "ClusterLabel"] = cluster_labels[int(c)]

    # Update students list with labels
    students = df.to_dict(orient="records")

    # Plot data (use lowercase 'gwa')
    plot_data = {
        "x": [s.get("gwa", 0) for s in students],
        "y": [s.get("income", 0) for s in students],
        "colors": [s.get("cluster_number", 0) for s in students],
        "text": [
            f"{s.get('firstname','')} {s.get('lastname','')}<br>"
            f"Program: {s.get('program','-')}<br>"
            f"Municipality: {s.get('municipality','-')}<br>"
            f"Location: {s.get('LocationCategory','-')}<br>"
            f"Income: {s.get('IncomeCategory','-')}<br>"
            f"Honors: {s.get('Honors','-')}<br>"
            f"SHS: {s.get('shs_type','-')}<br>"
            f"Cluster: {s.get('ClusterLabel','-')}"
            for s in students
        ]
    }

    # Group students by cluster number (keep numeric keys)
    clusters: Dict[int, List[dict]] = {}
    for s in students:
        cnum = int(s.get("cluster_number", s.get("Cluster", -1)))
        clusters.setdefault(cnum, []).append(s)

    # Centroids (keep GWA + income)
    centroids = []
    if cluster_info.get("centroids"):
        try:
            parsed = json.loads(cluster_info["centroids"])
            for c in parsed:
                if len(c) >= 2:
                    centroids.append([float(c[0]), float(c[1])])  # GWA + Income
        except Exception as exc:
            print("Error parsing centroids:", exc)
            centroids = []

    return {
        "clusters": clusters,
        "plot_data": plot_data,
        "centroids": centroids,
        "k": cluster_info["k"],
        "cluster_labels": cluster_labels
    }

# ------------------------
# RE-CLUSTER DATASET
# ------------------------
@router.post("/clusters/recluster")
async def recluster(
    k: int = Query(..., ge=2),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role", "")

    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    latest = cursor.fetchone()
    if not latest:
        cursor.close(); connection.close()
        raise HTTPException(status_code=404, detail="No dataset found")
    dataset_id = latest["id"]

    cursor.execute("SELECT * FROM students WHERE dataset_id = %s", (dataset_id,))
    students = cursor.fetchall()
    cursor.close(); connection.close()

    if not students:
        raise HTTPException(status_code=404, detail="No students found for latest dataset")
    if k > len(students):
        raise HTTPException(status_code=400, detail="k cannot be greater than number of students")

    # --- Encode features ---
    df = pd.DataFrame(students)
    df = encode_features(df)

    feature_cols = ["gwa", "income", "sex_code", "shs_code", "location_code"] + \
                   [c for c in df.columns if c.startswith("program_")]

    X = df[feature_cols].fillna(0).astype(float)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # --- KMeans ---
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    preds = kmeans.fit_predict(X_scaled)
    centroids = scaler.inverse_transform(kmeans.cluster_centers_).tolist()

    df["Cluster"] = preds
    cluster_labels = {c: describe_cluster(df, c) for c in sorted(df["Cluster"].unique())}
    df["ClusterLabel"] = df["Cluster"].map(cluster_labels)

    if role == "Admin":
        conn2 = get_db_connection()
        if not conn2:
            raise HTTPException(status_code=500, detail="Database connection failed")
        c2 = conn2.cursor(dictionary=True)

        # Clean old clusters
        c2.execute("SELECT id FROM clusters WHERE dataset_id = %s", (dataset_id,))
        olds = c2.fetchall() or []
        for oc in olds:
            c2.execute("DELETE FROM student_cluster WHERE cluster_id = %s", (oc["id"],))
        c2.execute("DELETE FROM clusters WHERE dataset_id = %s", (dataset_id,))

        # Save new cluster info
        c2.execute("INSERT INTO clusters (dataset_id, k, centroids) VALUES (%s, %s, %s)",
                   (dataset_id, k, json.dumps(centroids)))
        new_cluster_id = c2.lastrowid

        for idx, row in df.iterrows():
            c2.execute(
                "INSERT INTO student_cluster (student_id, cluster_id, cluster_number) VALUES (%s, %s, %s)",
                (int(row["id"]), new_cluster_id, int(row["Cluster"]))
            )

        conn2.commit()
        c2.close(); conn2.close()
        return {"message": f"Official dataset re-clustered with k={k}", "cluster_labels": cluster_labels}

    elif role == "Viewer":
        students_out = df.to_dict(orient="records")
        return {
            "message": f"Preview clustering with k={k} (not saved)",
            "students": students_out,
            "centroids": centroids,
            "cluster_labels": cluster_labels
        }

    else:
        raise HTTPException(status_code=403, detail="Unauthorized role")


# ------------------------
# PAIRWISE CLUSTERING ENDPOINT
# ------------------------
@router.get("/clusters/pairwise")
async def pairwise_clusters(
    x: str = Query(..., description="Feature name for X axis"),
    y: str = Query(..., description="Feature name for Y axis"),
    k: int = Query(3, ge=2),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["Admin", "Viewer"]:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    x_canon = _standard_col_name(x)
    y_canon = _standard_col_name(y)

    allowed = {"gwa", "income", "sex", "program", "municipality", "shs_type"}
    if x_canon not in allowed or y_canon not in allowed:
        raise HTTPException(status_code=400, detail=f"Allowed features: {sorted(list(allowed))}")

    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    latest = cur.fetchone()
    if not latest:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="No dataset found")
    dataset_id = latest["id"]

    cur.execute("SELECT * FROM students WHERE dataset_id = %s", (dataset_id,))
    students = cur.fetchall()
    cur.close(); conn.close()

    if not students:
        raise HTTPException(status_code=404, detail="No students found for latest dataset")
    if k > len(students):
        raise HTTPException(status_code=400, detail="k cannot be greater than number of students")

    df = pd.DataFrame(students)
    df = normalize_dataframe_columns(df)
    df = encode_categorical_safe(df, ["sex", "program", "municipality", "shs_type"])

    # ✅ Add LocationCategory using your utils
    from utils import classify_location, describe_cluster
    df["LocationCategory"] = df["municipality"].apply(classify_location)

    def actual_col(canon: str) -> str:
        if canon in {"sex", "program", "municipality", "shs_type"}:
            return f"{canon}_enc" if f"{canon}_enc" in df.columns else canon
        return canon

    x_col = actual_col(x_canon)
    y_col = actual_col(y_canon)

    if x_col not in df.columns or y_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Missing columns in dataset: {x_col}, {y_col}")

    X = df[[x_col, y_col]].fillna(0).astype(float)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    preds = kmeans.fit_predict(X_scaled)
    centroids = scaler.inverse_transform(kmeans.cluster_centers_).tolist()

    df["Cluster"] = preds

    # ✅ Generate descriptive cluster labels
    cluster_labels = {c: describe_cluster(df, c) for c in sorted(df["Cluster"].unique())}
    df["ClusterLabel"] = df["Cluster"].map(cluster_labels)

    # Students out
    students_out = []
    for _, row in df.iterrows():
        students_out.append({
            "id": int(row.get("id", 0)),
            "firstname": row.get("firstname"),
            "lastname": row.get("lastname"),
            "sex": row.get("sex"),
            "program": row.get("program"),
            "municipality": row.get("municipality"),
            "location": row.get("LocationCategory"),  # ✅ added location
            "income": float(row.get("income") or 0),
            "IncomeCategory": row.get("IncomeCategory"),
            "SHS_type": row.get("shs_type"),
            "GWA": float(row.get("gwa") or 0),
            "Honors": row.get("Honors"),
            "Cluster": int(row["Cluster"]),
            "ClusterLabel": row["ClusterLabel"],  # ✅ descriptive cluster name
            "pair_x": float(row[x_col]),
            "pair_y": float(row[y_col]),
            "pair_x_label": str(row.get(x_canon)) if row.get(x_canon) is not None else str(row.get(x_col)),
            "pair_y_label": str(row.get(y_canon)) if row.get(y_canon) is not None else str(row.get(y_col)),
        })

    # ✅ Plot data with location included
    plot_data = {
        "x": df[x_col].tolist(),
        "y": df[y_col].tolist(),
        "colors": df["Cluster"].tolist(),
        "labels": df["ClusterLabel"].tolist(),
        "locations": df["LocationCategory"].tolist(),  # ✅ included
        "text": [
            f"{r.get('firstname','')} {r.get('lastname','')}<br>"
            f"Program: {r.get('program','-')}<br>"
            f"Municipality: {r.get('municipality','-')}<br>"
            f"Location: {r.get('LocationCategory','-')}<br>"
            f"Income: {r.get('IncomeCategory','-')}<br>"
            f"Honors: {r.get('Honors','-')}<br>"
            f"SHS: {r.get('shs_type','-')}"
            for _, r in df.iterrows()
        ]
    }

    return {
        "students": students_out,
        "centroids": centroids,
        "x_name": x_canon,
        "y_name": y_canon,
        "k": k,
        "plot_data": plot_data,
        "x_categories": df[x_canon].unique().tolist() if x_canon in {"sex","program","municipality","shs_type"} else None,
        "y_categories": df[y_canon].unique().tolist() if y_canon in {"sex","program","municipality","shs_type"} else None,
    }