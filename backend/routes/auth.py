from fastapi import APIRouter, HTTPException, Response, Depends
from db import get_db_connection
from security import verify_password, get_password_hash, create_access_token
from dependencies import get_current_user
from config import ACCESS_TOKEN_EXPIRE_MINUTES
import json

router = APIRouter()

@router.post("/api/auth/login")
async def login(credentials: dict):
    email = credentials.get("email")
    password = credentials.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s AND active = TRUE", (email,))
    user = cursor.fetchone()
    cursor.close()
    connection.close()

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # ✅ Return access token in JSON (not cookie)
    access_token = create_access_token(data={"sub": user["email"]})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "profile": json.loads(user["profile"]) if user["profile"] else {}
        }
    }

@router.post("/api/auth/register")
async def register(user_data: dict):
    email = user_data.get("email")
    password = user_data.get("password")
    profile = user_data.get("profile", {})

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cursor.fetchone():
        cursor.close()
        connection.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(password)
    cursor.execute(
        "INSERT INTO users (email, password_hash, role, profile) VALUES (%s, %s, %s, %s)",
        (email, hashed_password, "Viewer", json.dumps(profile))
    )
    connection.commit()
    cursor.close()
    connection.close()
    return {"message": "User registered successfully"}

@router.post("/api/auth/logout")
async def logout():
    # Frontend just needs to delete token from localStorage
    return {"message": "Logged out successfully"}

@router.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": json.loads(current_user["profile"]) if current_user["profile"] else {}
    }
