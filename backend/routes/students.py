from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from db import get_db_connection
from dependencies import get_current_user
from utils import classify_honors, classify_income, normalize_student_record_db, normalize_student_record_display



router = APIRouter()

from utils import normalize_student_record_display

@router.get("/students")
async def get_students(
    program: Optional[str] = None,
    sex: Optional[str] = None,
    municipality: Optional[str] = None,
    income_category: Optional[str] = None,
    shs_type: Optional[str] = None,
    honors: Optional[str] = None,
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
    if search:
        # ✅ search both firstname and lastname
        query += " AND (firstname LIKE %s OR lastname LIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])

    cursor.execute(query, params)
    raw_students = cursor.fetchall()

    cursor.close()
    connection.close()

    # ✅ Normalize for display before returning
    students = [normalize_student_record_display(s) for s in raw_students]

    return students


# --- Request model ---
class StudentUpdate(BaseModel):
    firstname: str | None = None
    lastname: str | None = None
    program: str | None = None
    sex: str | None = None
    municipality: str | None = None
    SHS_type: str | None = None
    income: float | None = None     
    GWA: float | None = None       

@router.put("/students/{student_id}")
async def update_student(student_id: int, payload: StudentUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)

    # --- 1. Clean + update raw fields ---
    updates = []
    values = []
    clean_data = normalize_student_record_db(payload.dict(exclude_unset=True))

    for field, value in clean_data.items():
        if value is not None:  # only update fields provided
            updates.append(f"{field} = %s")
            values.append(value)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    values.append(student_id)
    query = f"UPDATE students SET {', '.join(updates)} WHERE id = %s"
    cursor.execute(query, values)

    # --- 2. Auto-recompute Honors & IncomeCategory ---
    recompute_updates = []
    recompute_values = []

    if payload.GWA is not None:
        recompute_updates.append("Honors = %s")
        recompute_values.append(classify_honors(payload.GWA))

    if payload.income is not None:
        recompute_updates.append("IncomeCategory = %s")
        recompute_values.append(classify_income(payload.income))

    if recompute_updates:
        recompute_values.append(student_id)
        query2 = f"UPDATE students SET {', '.join(recompute_updates)} WHERE id = %s"
        cursor.execute(query2, recompute_values)

    # --- 3. Fetch updated record before closing ---
    cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
    updated_student = cursor.fetchone()

    connection.commit()
    cursor.close()
    connection.close()

    return {
        "message": "Student updated successfully",
        "student": normalize_student_record_display(updated_student)
    }