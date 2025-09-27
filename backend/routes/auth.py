from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from db import get_db_connection
from security import verify_password, get_password_hash, create_access_token
from dependencies import get_current_user
from config import ACCESS_TOKEN_EXPIRE_MINUTES
import json

router = APIRouter()

# ---------------------------
# Request Models
# ---------------------------
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    profile: dict | None = None

# ---------------------------
# Auth Routes
# ---------------------------
@router.post("/api/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email
    password = payload.password

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

    access_token = create_access_token(data={"sub": user["email"]})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )

    return {
        "message": "Login successful",
        "access_token": access_token,   # <--- important for frontend
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "profile": json.loads(user["profile"]) if user["profile"] else {}
        }
    }

@router.post("/api/auth/register")
async def register(payload: RegisterRequest):
    email = payload.email
    password = payload.password
    profile = payload.profile or {}

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
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

@router.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": json.loads(current_user["profile"]) if current_user["profile"] else {}
    }
