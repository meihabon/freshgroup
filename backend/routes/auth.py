from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from db import get_db_connection
from security import verify_password, get_password_hash, create_access_token
from dependencies import get_current_user
from config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, MAILJET_API_KEY, MAILJET_SECRET_KEY, MAILJET_SENDER
from mailjet_rest import Client
from jose import jwt, JWTError
from datetime import datetime, timedelta
from .users import log_activity, resolve_user
import json, sys

router = APIRouter()

# ---------------------------
# Config
# ---------------------------
RESET_SECRET_KEY = SECRET_KEY
RESET_ALGORITHM = "HS256"
RESET_TOKEN_EXPIRE_MINUTES = 60


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

# 🔹 LOGIN
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

    # ✅ Log user login
    log_activity(user["id"], "Login", "User logged into the system")

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


# 🔹 LOGOUT
@router.post("/auth/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if user:
        log_activity(user["id"], "Logout", "User logged out of the system")

    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}


# 🔹 REGISTER (Admin only)
@router.post("/auth/register")
async def register(payload: RegisterRequest, current_user: dict = Depends(get_current_user)):
    user = resolve_user(current_user)
    if not user or user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can register new users")

    email = payload.email
    password = payload.password
    profile = payload.profile or {}

    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = connection.cursor(dictionary=True)
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

    # ✅ Log user creation (by Admin)
    log_activity(user["id"], "Register User", f"Admin created a new user: {email}")

    return {"message": "User registered successfully"}


# 🔹 GET CURRENT USER INFO
@router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": json.loads(current_user["profile"]) if current_user["profile"] else {},
    }


# 🔹 FORGOT PASSWORD
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

    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode({"sub": user["email"], "exp": expire}, RESET_SECRET_KEY, algorithm=RESET_ALGORITHM)
    reset_link = f"https://freshgroup-ispsc.vercel.app/reset-password?token={token}"

    # ✅ Log password reset request
    log_activity(user["id"], "Forgot Password", "User requested a password reset link")

    # --- Send email ---
    try:
        mailjet = Client(auth=(MAILJET_API_KEY, MAILJET_SECRET_KEY), version='v3.1')
        data = {
            'Messages': [
                {
                    "From": {"Email": MAILJET_SENDER, "Name": "FreshGroup"},
                    "To": [{"Email": payload.email}],
                    "Subject": "Password Reset Request",
                    "HTMLPart": f"""
                        <h3>Password Reset</h3>
                        <p>Hello,</p>
                        <p>Click the link below to reset your password (valid for 1 hour):</p>
                        <a href='{reset_link}'>{reset_link}</a>
                        <p>If you did not request this, please ignore this email.</p>
                    """
                }
            ]
        }
        result = mailjet.send.create(data=data)
        if result.status_code != 200:
            raise Exception("Mailjet send failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send reset email")

    return {"message": "Password reset link sent to your email"}


# 🔹 RESET PASSWORD
@router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    try:
        decoded = jwt.decode(payload.token, RESET_SECRET_KEY, algorithms=[RESET_ALGORITHM])
        email = decoded.get("sub")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    pwd = payload.new_password
    if len(pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_password = get_password_hash(pwd)
    cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (hashed_password, email))
    connection.commit()
    cursor.close()
    connection.close()

    # ✅ Log password reset success
    log_activity(user["id"], "Reset Password", "User successfully reset their password")

    return {"message": "Password updated successfully"}
