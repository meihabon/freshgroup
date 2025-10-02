from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from db import get_db_connection
from dependencies import get_current_user
from utils import classify_income, classify_honors, classify_location

router = APIRouter()

@router.get("/students")
async def get_students(
    program: Optional[str] = None,
    sex: Optional[str] = None,
    municipality: Optional[str] = None,
    income_category: Optional[str] = None,
    shs_type: Optional[str] = None,
    honors: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT id FROM datasets ORDER BY upload_date DESC LIMIT 1")
    latest_dataset = cursor.fetchone()
    if not latest_dataset:
        cursor.close()
        connection.close()
        return []

    dataset_id = latest_dataset["id"]

    query = "SELECT * FROM students WHERE dataset_id = %s"
    params = [dataset_id]

    if program:
        query += " AND program = %s"
        params.append(program)
    if sex:
        query += " AND sex = %s"
        params.append(sex)
    if municipality:
        query += " AND municipality = %s"
        params.append(municipality)
    if income_category:
        query += " AND IncomeCategory = %s"
        params.append(income_category)
    if shs_type:
        query += " AND SHS_type = %s"
        params.append(shs_type)
    if honors:
        query += " AND Honors = %s"
        params.append(honors)
    if location:
        query += " AND LocationCategory = %s"
        params.append(location)

    if search:
        query += " AND (firstname LIKE %s OR lastname LIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])

    cursor.execute(query, params)
    students = cursor.fetchall()
    cursor.close()
    connection.close()
    return students


@router.put("/students/{student_id}")
async def update_student(
    student_id: int,
    student_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = connection.cursor(dictionary=True)

    # Fetch existing student
    cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
    student = cursor.fetchone()
    if not student:
        cursor.close()
        connection.close()
        raise HTTPException(status_code=404, detail="Student not found")

    # Extract editable fields
    firstname = student_data.get("firstname", student["firstname"])
    lastname = student_data.get("lastname", student["lastname"])
    sex = student_data.get("sex", student["sex"])
    program = student_data.get("program", student["program"])
    municipality = student_data.get("municipality", student["municipality"])
    shs_type = student_data.get("SHS_type", student["SHS_type"])

    # Ensure numeric values for classification
    gwa = student_data.get("GWA", student["GWA"])
    try:
        gwa_val = float(gwa) if gwa is not None else None
    except ValueError:
        gwa_val = None

    income = student_data.get("income", student["income"])
    try:
        income_val = float(income) if income is not None else None
    except ValueError:
        income_val = None

    # 🔒 System-computed fields
    honors = classify_honors({"gwa": gwa_val})
    income_category = classify_income(income_val)
    location_category = classify_location(municipality)

    # Update student row
    update_query = """
        UPDATE students
        SET firstname=%s, lastname=%s, sex=%s, program=%s,
            municipality=%s, SHS_type=%s, GWA=%s, income=%s,
            Honors=%s, IncomeCategory=%s, LocationCategory=%s
        WHERE id=%s
    """
    cursor.execute(update_query, (
        firstname, lastname, sex, program,
        municipality, shs_type, gwa_val, income_val,
        honors, income_category, location_category,
        student_id
    ))
    connection.commit()

    # === Recompute cluster assignment ===
    # Get latest cluster info
    cursor.execute("""
        SELECT c.id as cluster_id, c.k, c.centroids
        FROM clusters c
        JOIN datasets d ON c.dataset_id = d.id
        ORDER BY d.upload_date DESC LIMIT 1
    """)
    cluster_info = cursor.fetchone()

    new_cluster_num = None
    if cluster_info and cluster_info.get("centroids"):
        import json
        import numpy as np
        import pandas as pd
        from sklearn.preprocessing import StandardScaler
        from sklearn.cluster import KMeans
        from utils import encode_features

        # Re-fetch student with fresh data
        cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
        updated_student = cursor.fetchone()
        df = pd.DataFrame([updated_student])
        df = encode_features(df)

        feature_cols = ["gwa", "income", "sex_code", "shs_code", "location_code"] + \
                       [c for c in df.columns if c.startswith("program_")]
        X = df[feature_cols].fillna(0).astype(float)

        # Rebuild model using stored centroids' k
        k = cluster_info["k"]
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Load KMeans again using stored k (note: not restoring exact centroids, just re-predicting)
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        preds = kmeans.fit_predict(X_scaled)
        new_cluster_num = int(preds[0])

        # Update student_cluster
        cursor.execute("DELETE FROM student_cluster WHERE student_id = %s", (student_id,))
        cursor.execute(
            "INSERT INTO student_cluster (student_id, cluster_id, cluster_number) VALUES (%s, %s, %s)",
            (student_id, cluster_info["cluster_id"], new_cluster_num)
        )
        connection.commit()

    cursor.close()
    connection.close()

    return {
        "message": "Student updated successfully",
        "new_cluster": new_cluster_num
    }