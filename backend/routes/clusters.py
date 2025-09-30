from fastapi import APIRouter, Depends, HTTPException, Query
from db import get_db_connection
from dependencies import get_current_user
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
import json
from typing import List, Dict

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
        return {"clusters": {}, "plot_data": {}, "centroids": []}

    cursor.execute("""
        SELECT s.*, sc.cluster_number
        FROM students s
        LEFT JOIN student_cluster sc ON s.id = sc.student_id
        WHERE s.dataset_id = %s
    """, (cluster_info["dataset_id"],))
    students = cursor.fetchall()

    cursor.close()
    connection.close()

    plot_data = {
        "x": [s.get("GWA", 0) for s in students],
        "y": [s.get("income", 0) for s in students],
        "colors": [s.get("cluster_number", 0) for s in students],
        "text": [
            f"{s.get('firstname','')} {s.get('lastname','')}<br>Program: {s.get('program','-')}<br>Municipality: {s.get('municipality','-')}<br>"
            f"Income: {s.get('IncomeCategory','-')}<br>Honors: {s.get('Honors','-')}<br>SHS: {s.get('SHS_type','-')}"
            for s in students
        ]
    }

    clusters: Dict[int, List[dict]] = {}
    for student in students:
        cnum = int(student.get("cluster_number", 0))
        # ✅ enforce integer cluster IDs in the student dict itself
        student["cluster_number"] = cnum
        clusters.setdefault(cnum, []).append(student)

    centroids = []
    if cluster_info.get("centroids"):
        try:
            parsed = json.loads(cluster_info["centroids"])
            # parsed is list of full feature centroids [gwa, income, sex_enc, program_enc, ...]
            for c in parsed:
                if len(c) >= 2:
                    centroids.append([float(c[0]), float(c[1])])  # only GWA (x) and Income (y)
        except Exception as exc:
            print("Error parsing centroids:", exc)
            centroids = []


        return {
            "clusters": clusters,
            "plot_data": plot_data,
            "centroids": centroids,
            "k": cluster_info["k"],   # ✅ send official k to frontend
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
    if not students:
        cursor.close(); connection.close()
        raise HTTPException(status_code=404, detail="No students found for latest dataset")

    if k > len(students):
        cursor.close(); connection.close()
        raise HTTPException(status_code=400, detail="k cannot be greater than number of students")

    df = pd.DataFrame(students)
    df = normalize_dataframe_columns(df)
    df = encode_categorical_safe(df, ["sex", "program", "municipality", "shs_type"])

    canonical_features = ["gwa", "income", "sex", "program", "municipality", "shs_type"]
    feature_cols = _pick_feature_columns(df, canonical_features)
    if not feature_cols:
        cursor.close(); connection.close()
        raise HTTPException(status_code=400, detail="No usable features for clustering")

    X = df[feature_cols].fillna(0).astype(float)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    preds = kmeans.fit_predict(X_scaled)
    centroids = scaler.inverse_transform(kmeans.cluster_centers_).tolist()

    cursor.close(); connection.close()

    if role == "Admin":
        conn2 = get_db_connection()
        if not conn2:
            raise HTTPException(status_code=500, detail="Database connection failed")
        c2 = conn2.cursor(dictionary=True)

        c2.execute("SELECT id FROM clusters WHERE dataset_id = %s", (dataset_id,))
        olds = c2.fetchall() or []
        for oc in olds:
            c2.execute("DELETE FROM student_cluster WHERE cluster_id = %s", (oc["id"],))
        c2.execute("DELETE FROM clusters WHERE dataset_id = %s", (dataset_id,))

        c2.execute("INSERT INTO clusters (dataset_id, k, centroids) VALUES (%s, %s, %s)",
                   (dataset_id, k, json.dumps(centroids)))
        new_cluster_id = c2.lastrowid

        for idx, row in enumerate(students):
            student_id = int(row["id"])
            c2.execute("INSERT INTO student_cluster (student_id, cluster_id, cluster_number) VALUES (%s, %s, %s)",
                       (student_id, new_cluster_id, int(preds[idx])))

        conn2.commit()
        c2.close(); conn2.close()

        return {"message": f"Official dataset re-clustered with k={k}"}

    elif role == "Viewer":
        out_students = []
        for idx, s in enumerate(students):
            s_copy = dict(s)
            s_copy["Cluster"] = int(preds[idx])
            out_students.append(s_copy)

        return {"message": f"Preview clustering with k={k} (not saved)", "students": out_students, "centroids": centroids}

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

    students_out = []
    for _, row in df.iterrows():
        students_out.append({
            "id": int(row.get("id", 0)),
            "firstname": row.get("firstname"),
            "lastname": row.get("lastname"),
            "sex": row.get("sex"),
            "program": row.get("program"),
            "municipality": row.get("municipality"),
            "income": float(row.get("income") or 0),
            "SHS_type": row.get("shs_type"),
            "GWA": float(row.get("gwa") or 0),
            "Honors": row.get("Honors"),
            "IncomeCategory": row.get("IncomeCategory"),
            "Cluster": int(row["Cluster"]),
            "pair_x": float(row[x_col]),
            "pair_y": float(row[y_col]),
            "pair_x_label": str(row.get(x_canon)) if row.get(x_canon) is not None else str(row.get(x_col)),
            "pair_y_label": str(row.get(y_canon)) if row.get(y_canon) is not None else str(row.get(y_col)),
        })


    return {
        "students": students_out,
        "centroids": centroids,
        "x_name": x_canon,
        "y_name": y_canon,
        "k": k,
        "x_categories": df[x_canon].unique().tolist() if x_canon in {"sex","program","municipality","shs_type"} else None,
        "y_categories": df[y_canon].unique().tolist() if y_canon in {"sex","program","municipality","shs_type"} else None,
    }
