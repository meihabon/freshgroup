from fastapi import APIRouter, HTTPException, Body, Depends
from db import get_db_connection
from dependencies import get_current_user
from security import get_password_hash, verify_password
import json
from pydantic import BaseModel, Extra
from typing import Optional

router = APIRouter()

# --- helper ---
def resolve_user(current_user: dict):
    """
    Resolve a user from either ID (int) or email (string) in current_user.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    user = None
    sub = current_user.get("id") or current_user.get("sub")

    # Try integer id
    try:
        cursor.execute("SELECT * FROM users WHERE id=%s", (int(sub),))
        user = cursor.fetchone()
    except (ValueError, TypeError):
        pass

    # Try email if id lookup failed
    if not user and isinstance(sub, str):
        cursor.execute("SELECT * FROM users WHERE email=%s", (sub,))
        user = cursor.fetchone()

    cursor.close()
    connection.close()

    return user

def log_activity(user_id: int, action: str, details: str = ""):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        "INSERT INTO activity_logs (user_id, action, details) VALUES (%s, %s, %s)",
        (user_id, action, details)
    )
    connection.commit()
    cursor.close()
    connection.close()

# --- Get all users (Admin only) ---
@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if not user or user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view users")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id, email, role, active, profile, created_at FROM users ORDER BY created_at DESC")
    users = cursor.fetchall()
    for u in users:
        if u["profile"]:
            profile = json.loads(u["profile"])
            u["profile"] = {
                "name": profile.get("name", ""),
                "department": profile.get("department", ""),
                "position": profile.get("position", "")
            }
        else:
            u["profile"] = {"name": "", "department": "", "position": ""}
    cursor.close()
    connection.close()
    return users


# --- User changes their own password ---
@router.post("/users/change-password")
async def change_password(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")
    confirm_password = data.get("confirmPassword")

    if not current_password or not new_password or not confirm_password:
        raise HTTPException(status_code=400, detail="All fields are required")
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    if not verify_password(current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_hashed = get_password_hash(new_password)

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("UPDATE users SET password_hash=%s WHERE id=%s", (new_hashed, user["id"]))
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "Password updated successfully"}


# --- Get current logged-in user ---
@router.get("/users/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["profile"] = json.loads(user["profile"]) if user["profile"] else {"name": "", "department": "", "position": ""}
    return user


# --- Create new user (Admin only) ---
@router.post("/users")
async def create_user(
    data: dict = Body(...), 
    current_user: dict = Depends(get_current_user)
):
    user = resolve_user(current_user)
    if not user or user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can create users")

    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "Viewer")
    profile = {
        "name": data.get("name", ""),
        "department": data.get("department", ""),
        "position": data.get("position", "")
    }

    # --- validation checks ---
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    # --- check if email already exists ---
    cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
    if cursor.fetchone():
        cursor.close()
        connection.close()
        raise HTTPException(status_code=400, detail="Email already exists")

    # --- save user ---
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


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None

    class Config:
        extra = "ignore"  # ignore any unexpected fields

# --- Update current logged-in user's profile ---
@router.put("/users/me")
async def update_current_user_profile(update: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {k: v for k, v in update.dict().items() if v and v.strip()}
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")

    existing_profile = json.loads(user["profile"]) if user["profile"] else {}
    updated_profile = {**existing_profile, **updates}

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(
        "UPDATE users SET profile=%s WHERE id=%s",
        (json.dumps(updated_profile), user["id"])
    )
    connection.commit()
    cursor.close()
    connection.close()

    return {"message": "Profile updated successfully", "profile": updated_profile}

# --- Admin resets a user's password ---
@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: int,
    data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    # Ensure only Admins can reset
    user = resolve_user(current_user)
    if not user or user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can reset passwords")

    new_password = data.get("newPassword")
    confirm_password = data.get("confirmPassword")

    if not new_password or not confirm_password:
        raise HTTPException(status_code=400, detail="Both password fields are required")
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE id=%s", (user_id,))
    target_user = cursor.fetchone()
    if not target_user:
        cursor.close()
        connection.close()
        raise HTTPException(status_code=404, detail="Target user not found")

    hashed = get_password_hash(new_password)
    cursor.execute("UPDATE users SET password_hash=%s WHERE id=%s", (hashed, user_id))
    connection.commit()
    cursor.close()
    connection.close()

    return {"message": f"Password for user {user_id} has been reset successfully"}

# --- Update existing user (Admin only) ---
@router.put("/users/{user_id}")
async def update_user(user_id: int, data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if not user or user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can update users")

    role = data.get("role")
    profile = {
        "name": data.get("name", ""),
        "department": data.get("department", ""),
        "position": data.get("position", "")
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

@router.post("/users/change-password")
async def change_password(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    ...
    connection.commit()
    cursor.close()
    connection.close()

    # Log it
    log_activity(user["id"], "Password Change", "User updated their password")
    return {"message": "Password updated successfully"}

# --- Delete User ---
@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if not user or user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can delete users")

    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM users WHERE id=%s", (user_id,))
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "User deleted successfully"}
@router.get("/activity-logs")
async def get_activity_logs(current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    if user["role"] == "Admin":
        # Admin sees all logs
        cursor.execute("""
            SELECT a.id, a.action, a.details, a.created_at,
                   u.email AS user_email
            FROM activity_logs a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
        """)
    else:
        # Regular user sees only their logs
        cursor.execute("""
            SELECT id, action, details, created_at
            FROM activity_logs
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user["id"],))

    logs = cursor.fetchall()
    cursor.close()
    connection.close()
    return logs
