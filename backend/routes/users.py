from fastapi import APIRouter, HTTPException, Body, Depends
from db import get_db_connection
from dependencies import get_current_user
from security import get_password_hash, verify_password
import json
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# --- Pydantic model for profile updates ---
class ProfileUpdate(BaseModel):
    name: Optional[str] = ""
    department: Optional[str] = ""
    position: Optional[str] = ""


# --- Get all users (Admin only) ---
@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view users")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id, email, role, active, profile, created_at FROM users ORDER BY created_at DESC")
    users = cursor.fetchall()
    for user in users:
        user["profile"] = json.loads(user["profile"]) if user["profile"] else {"name": "", "department": ""}
    cursor.close()
    connection.close()
    return users


# --- Get current logged-in user ---
@router.get("/users/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    # Return both account info and profile
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id, email, role, active, profile, created_at FROM users WHERE id=%s", (current_user["id"],))
    user = cursor.fetchone()
    cursor.close()
    connection.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["profile"] = json.loads(user["profile"]) if user["profile"] else {"name": "", "department": "", "position": ""}
    return user


# --- Create new user (Admin only) ---
@router.post("/users")
async def create_user(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can create users")

    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "Viewer")
    profile = {
        "name": data.get("name", ""),
        "department": data.get("department", "")
    }

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
    if cursor.fetchone():
        cursor.close()
        connection.close()
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = get_password_hash(password)
    cursor.execute(
        "INSERT INTO users (email, password_hash, role, profile, active) VALUES (%s, %s, %s, %s, TRUE)",
        (email, hashed_password, role, json.dumps(profile))
    )
    connection.commit()
    new_id = cursor.lastrowid
    cursor.close()
    connection.close()
    return {"message": "User created successfully", "id": new_id}


# --- Update existing user (Admin only) ---
@router.put("/users/{user_id}")
async def update_user(user_id: int, data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can update users")

    role = data.get("role")
    profile = {
        "name": data.get("name", ""),
        "department": data.get("department", "")
    }

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE id=%s", (user_id,))
    if not cursor.fetchone():
        cursor.close()
        connection.close()
        raise HTTPException(status_code=404, detail="User not found")

    cursor.execute(
        "UPDATE users SET role=%s, profile=%s WHERE id=%s",
        (role, json.dumps(profile), user_id)
    )
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "User updated successfully"}


# --- Update current logged-in user's profile ---
@router.put("/users/me")
async def update_current_user_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    profile = data.dict()

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        "UPDATE users SET profile=%s WHERE id=%s",
        (json.dumps(profile), current_user["id"])
    )
    connection.commit()
    cursor.close()
    connection.close()

    return {"message": "Profile updated successfully", "profile": profile}


# --- Delete User ---
@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can delete users")

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM users WHERE id=%s", (user_id,))
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "User deleted successfully"}