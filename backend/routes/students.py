from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from db import get_db_connection
from dependencies import get_current_user
from utils import classify_income, classify_honors
from .clusters import recluster, is_record_complete
import asyncio
router = APIRouter()

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
    gwa = student_data.get("GWA", student["GWA"])
    income = student_data.get("income", student["income"])

    # 🔒 Honors & IncomeCategory should be system-computed
    honors = classify_honors({"gwa": gwa})
    income_category = classify_income(income)

    # ✅ define the update_query here
    update_query = """
        UPDATE students
        SET firstname=%s, lastname=%s, sex=%s, program=%s,
            municipality=%s, SHS_type=%s, GWA=%s, income=%s,
            Honors=%s, IncomeCategory=%s
        WHERE id=%s
    """

    try:
        cursor.execute(update_query, (
            firstname, lastname, sex, program,
            municipality, shs_type, gwa, income,
            honors, income_category, student_id
        ))
        connection.commit()
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
    finally:
        cursor.close()
        connection.close()
        record_data = {
        "firstname": firstname,
        "lastname": lastname,
        "sex": sex,
        "program": program,
        "municipality": municipality,
        "income": income,
        "shs_type": shs_type,
        "GWA": gwa
    }

    if is_record_complete(record_data):
        try:
            # ⚙️ Automatically recluster complete records (k=3 default, adjust as needed)
            await recluster(k=3, current_user=current_user)
        except Exception as e:
            print("⚠️ Auto-recluster failed:", str(e))
            
    return {"message": "Student updated successfully"}