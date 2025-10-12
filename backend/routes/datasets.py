# datasets.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from db import get_db_connection
from dependencies import get_current_user
from utils import classify_honors, classify_income
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from kneed import KneeLocator
import pandas as pd
import os, uuid, json
from datetime import datetime
from typing import List
from fastapi.responses import StreamingResponse
import csv
import io
from .clusters import is_record_complete

router = APIRouter()
os.makedirs("uploads", exist_ok=True)

# --- Helper: Normalize & Prepare DataFrame ---
def normalize_and_prepare_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = df.columns.str.strip().str.lower()

    # Map common variations
    col_map = {
        "sex": "sex", "gender": "sex",
        "program": "program", "course": "program",
        "municipality": "municipality", "city": "municipality",
        "income": "income", "family income": "income",
        "shs_type": "shs_type", "strand": "shs_type",
        "gwa": "gwa", "general weighted average": "gwa",
        "firstname": "firstname", "first name": "firstname", "fname": "firstname",
        "lastname": "lastname", "last name": "lastname", "surname": "lastname", "lname": "lastname",
        "name": "name", "fullname": "name", "student name": "name"
    }
    df = df.rename(columns={col: col_map[col] for col in df.columns if col in col_map})

    # ✅ Handle case: dataset has only `name` instead of firstname/lastname
    if "name" in df.columns and ("firstname" not in df.columns or "lastname" not in df.columns):
        name_split = df["name"].astype(str).str.strip().str.split(" ", n=1, expand=True)
        df["firstname"] = name_split[0]
        df["lastname"] = name_split[1] if name_split.shape[1] > 1 else ""

    # Ensure required columns exist
    required_cols = ["firstname", "lastname", "sex", "program", "municipality", "income", "shs_type", "gwa"]
    for col in required_cols:
        if col not in df.columns:
            df[col] = None

    # Derive Honors & IncomeCategory
    df["Honors"] = df.apply(classify_honors, axis=1)
    df["IncomeCategory"] = df["income"].apply(classify_income)

    # Clean numerics
    df["gwa"] = pd.to_numeric(df["gwa"], errors="coerce")
    df["income"] = pd.to_numeric(df["income"], errors="coerce")

    # Encode categoricals
    categorical_cols = ["sex", "program", "municipality", "shs_type"]
    for col in categorical_cols:
        enc_col = f"{col}_enc"
        try:
            le = LabelEncoder()
            df[col] = df[col].fillna("Unknown").replace("", "Unknown")
            df[enc_col] = le.fit_transform(df[col].astype(str))
        except Exception:
            uniques = {
                v: i
                for i, v in enumerate(
                    df[col].fillna("Unknown").replace("", "Unknown").astype(str).unique()
                )
            }
            df[enc_col] = df[col].astype(str).map(uniques)

    return df

# --- Elbow Helper Functions ---
def compute_wcss_for_range(X_scaled, k_min=2, k_max=10) -> List[float]:
    wcss = []
    for k in range(k_min, k_max + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(X_scaled)
        wcss.append(float(kmeans.inertia_))
    return wcss

def recommend_k_by_curvature(wcss: List[float], k_min=2) -> int:
    try:
        kneedle = KneeLocator(
            range(k_min, k_min + len(wcss)),
            wcss,
            curve="convex",
            direction="decreasing"
        )
        if kneedle.knee is not None:
            return int(kneedle.knee)
    except Exception:
        pass
    return max(2, min(5, len(wcss) // 2))  # fallback default

# -----------------------------
# Elbow Preview
# -----------------------------
@router.post("/datasets/elbow")
async def elbow_preview(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can compute elbow preview")

    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    file_path = f"uploads/{uuid.uuid4()}_{file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path, dtype={"income": "float64", "gwa": "float64"}, low_memory=False)
        else:
            df = pd.read_excel(file_path)

        df = normalize_and_prepare_df(df)

        features = ['gwa', 'income']
        X = df[features].fillna(0)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        wcss = compute_wcss_for_range(X_scaled, k_min=2, k_max=10)
        recommended_k = recommend_k_by_curvature(wcss)

        return {"wcss": wcss, "recommended_k": recommended_k}

    import traceback

    except Exception as e:
        traceback.print_exc()  # ✅ show full error in console
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing dataset: {repr(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# -----------------------------
# Upload Dataset
# -----------------------------
@router.post("/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    k: int | None = None,   # optional k
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can upload datasets")

    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")

    file_path = f"uploads/{uuid.uuid4()}_{file.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path, dtype={"income": "float64", "gwa": "float64"}, low_memory=False)
        else:
            df = pd.read_excel(file_path)

        df = normalize_and_prepare_df(df)

        # ✅ Filter only complete records for clustering
        complete_df = df[df.apply(lambda row: is_record_complete(row.to_dict()), axis=1)]

        if complete_df.empty:
            raise HTTPException(status_code=400, detail="No complete student records found for clustering")

        features = ['gwa', 'income']
        X = complete_df[features].astype(float)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)


        # auto-select k if not provided
        if k is None:
            wcss = compute_wcss_for_range(X_scaled, k_min=2, k_max=10)
            k = recommend_k_by_curvature(wcss)

        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        df['Cluster'] = kmeans.fit_predict(X_scaled)
        df['Cluster'] = df['Cluster'].astype(int)   # force int, not string

        all_centroids = scaler.inverse_transform(kmeans.cluster_centers_)
    # Keep only GWA (index 0) and income (index 1)
        centroids = [[c[0], c[1]] for c in all_centroids]

        connection = get_db_connection()
        if not connection:
            os.remove(file_path)
            raise HTTPException(status_code=500, detail="Database connection failed")
        cursor = connection.cursor()

        cursor.execute(
            "INSERT INTO datasets (filename, uploaded_by, upload_date) VALUES (%s, %s, %s)",
            (file.filename, current_user["id"], datetime.now())
        )
        dataset_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO clusters (dataset_id, k, centroids) VALUES (%s, %s, %s)",
            (dataset_id, k, json.dumps(centroids))
        )
        cluster_id = cursor.lastrowid

        for _, row in df.iterrows():
            # ---------- Handle text and numeric cleanup ----------
            def safe_text(val):
                if pd.isna(val) or str(val).strip() == "" or str(val).lower() in ["n/a", "na", "none"]:
                    return "Incomplete"
                return str(val).strip()

            def safe_num(val):
                if pd.isna(val) or str(val).strip() == "" or str(val).lower() in ["n/a", "na", "none"]:
                    return -1
                try:
                    return float(val)
                except Exception:
                    return -1

            firstname = safe_text(row.get("firstname"))
            lastname = safe_text(row.get("lastname"))
            sex = safe_text(row.get("sex"))
            program = safe_text(row.get("program"))
            municipality = safe_text(row.get("municipality"))
            shs_type = safe_text(row.get("shs_type"))

            income_val = safe_num(row.get("income"))
            gwa_val = safe_num(row.get("gwa"))

            honors = safe_text(row.get("Honors"))
            income_category = safe_text(row.get("IncomeCategory"))

            # ---------- Insert every student record ----------
            cursor.execute("""
                INSERT INTO students (firstname, lastname, sex, program, municipality, income, shs_type, gwa, Honors, IncomeCategory, dataset_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                firstname,
                lastname,
                sex,
                program,
                municipality,
                income_val,
                shs_type,
                gwa_val,
                honors,
                income_category,
                dataset_id
            ))
            student_id = cursor.lastrowid

            # ---------- Check if record is complete ----------
            def is_record_complete_local(row_dict):
                required = ["firstname", "lastname", "sex", "program", "municipality", "income", "shs_type", "gwa"]
                placeholders = {"", "n/a", "na", "none", "incomplete", None, -1}
                for f in required:
                    val = row_dict.get(f)
                    if isinstance(val, str) and val.strip().lower() in placeholders:
                        return False
                    if val in placeholders:
                        return False
                    if f in ["income", "gwa"]:
                        try:
                            num = float(val)
                            if num <= 0:
                                return False
                        except Exception:
                            return False
                return True

            # ---------- Only link complete students to clusters ----------
            if is_record_complete_local({
                "firstname": firstname,
                "lastname": lastname,
                "sex": sex,
                "program": program,
                "municipality": municipality,
                "income": income_val,
                "shs_type": shs_type,
                "gwa": gwa_val
            }):
                # Match cluster assignment from complete_df if available
                if _ in complete_df.index:
                    cluster_num = int(complete_df.loc[_]["Cluster"])
                else:
                    cluster_num = 0
                cursor.execute(
                    "INSERT INTO student_cluster (student_id, cluster_id, cluster_number) VALUES (%s, %s, %s)",
                    (student_id, cluster_id, cluster_num)
                )



        connection.commit()
        cursor.close()
        connection.close()
        os.remove(file_path)

        return {
            "message": "Dataset uploaded and processed successfully",
            "dataset_id": dataset_id,
            "total_students": len(df),
            "clusters": k
        }

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing dataset: {str(e)}")

# -----------------------------
# Get Dataset History
# -----------------------------
@router.get("/datasets")
async def get_datasets(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view dataset history")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("""
        SELECT d.id, d.filename, d.upload_date, u.email as uploaded_by_email,
            COUNT(DISTINCT s.id) AS student_count,
            MAX(c.k) AS cluster_count
        FROM datasets d
        LEFT JOIN users u ON d.uploaded_by = u.id
        LEFT JOIN students s ON d.id = s.dataset_id
        LEFT JOIN clusters c ON d.id = c.dataset_id
        GROUP BY d.id, d.filename, d.upload_date, u.email
        ORDER BY d.upload_date DESC
    """)

    datasets = cursor.fetchall()
    cursor.close()
    connection.close()
    return datasets

# -----------------------------
# Preview Dataset
# -----------------------------
@router.get("/datasets/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: int,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can preview datasets")

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute(
        "SELECT * FROM students WHERE dataset_id = %s LIMIT 15",
        (dataset_id,)
    )
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return {"rows": rows}


# -----------------------------
# Download Dataset
# -----------------------------
@router.get("/datasets/{dataset_id}/download")
async def download_dataset(dataset_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can download datasets")

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT filename FROM datasets WHERE id = %s", (dataset_id,))
    dataset = cur.fetchone()
    if not dataset:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")

    # fetch all students for this dataset
    cur.execute("SELECT * FROM students WHERE dataset_id = %s", (dataset_id,))
    rows = cur.fetchall()
    cur.close(); conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="No students found for this dataset")

    # generate CSV in memory
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)

    # return as streaming response
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={dataset['filename'].rsplit('.',1)[0]}_export.csv"
        }
    )
# -----------------------------
# Delete Dataset
# -----------------------------
@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can delete datasets")

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM student_cluster WHERE student_id IN (SELECT id FROM students WHERE dataset_id = %s)", (dataset_id,))
    cursor.execute("DELETE FROM students WHERE dataset_id = %s", (dataset_id,))
    cursor.execute("DELETE FROM clusters WHERE dataset_id = %s", (dataset_id,))
    cursor.execute("DELETE FROM datasets WHERE id = %s", (dataset_id,))
    cursor.close()
    connection.close()
    return {"message": "Dataset deleted successfully"}
