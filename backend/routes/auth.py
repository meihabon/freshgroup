from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from db import get_db_connection
from security import verify_password, get_password_hash, create_access_token
from dependencies import get_current_user
from config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from config import conf
from fastapi_mail import FastMail, MessageSchema

from jose import jwt, JWTError
from datetime import datetime, timedelta
import json

router = APIRouter()

# ---------------------------
# Config
# ---------------------------
RESET_SECRET_KEY = SECRET_KEY  # ✅ reuse main secret
RESET_ALGORITHM = "HS256"
RESET_TOKEN_EXPIRE_MINUTES = 60

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM = os.getenv("RESEND_FROM", "no-reply@example.com")
resend.api_key = RESEND_API_KEY
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


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ---------------------------
# Auth Routes
# ---------------------------
@router.post("/auth/login")
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
        samesite="lax",
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "profile": json.loads(user["profile"]) if user["profile"] else {},
        },
    }


@router.post("/auth/register")
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
        (email, hashed_password, "Viewer", json.dumps(profile)),
    )
    connection.commit()
    cursor.close()
    connection.close()

    return {"message": "User registered successfully"}


@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}


@router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": json.loads(current_user["profile"]) if current_user["profile"] else {},
    }


# ---------------------------
# Forgot / Reset Password
# ---------------------------
@router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (payload.email,))
    user = cursor.fetchone()
    cursor.close()
    connection.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Create reset token
    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode({"sub": user["email"], "exp": expire}, RESET_SECRET_KEY, algorithm=RESET_ALGORITHM)

    reset_link = f"https://freshgroup-ispsc.vercel.app/reset-password?token={token}"

    # Send email
    message = MessageSchema(
        subject="Password Reset Request",
        recipients=[payload.email],
        body=f"""
        <h3>Password Reset</h3>
        <p>Hello,</p>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <a href="{reset_link}">{reset_link}</a>
        """,
        subtype="html",
    )

    fm = FastMail(conf)
    await fm.send_message(message)

    return {"message": "Password reset link sent to your email"}


@router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    try:
        decoded = jwt.decode(payload.token, RESET_SECRET_KEY, algorithms=[RESET_ALGORITHM])
        email = decoded.get("sub")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # 🔒 Password validation
    pwd = payload.new_password
    if len(pwd) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not any(c.isupper() for c in pwd):
        raise HTTPException(status_code=400, detail="Password must include at least one uppercase letter")
    if not any(c.islower() for c in pwd):
        raise HTTPException(status_code=400, detail="Password must include at least one lowercase letter")
    if not any(c.isdigit() for c in pwd):
        raise HTTPException(status_code=400, detail="Password must include at least one number")
    if not any(c in "!@#$%^&*()-_=+[]{}|;:'\",.<>?/`~" for c in pwd):
        raise HTTPException(status_code=400, detail="Password must include at least one special character")

    # 🔎 Verify user exists
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    # 🔑 Save new hashed password
    hashed_password = get_password_hash(pwd)
    cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (hashed_password, email))
    connection.commit()
    cursor.close()
    connection.close()

    return {"message": "Password updated successfully"}
