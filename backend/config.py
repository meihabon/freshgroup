import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()  # local dev, Railway ignores this

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_CONFIG = {
    "host": os.getenv("MYSQLHOST"),
    "port": int(os.getenv("MYSQLPORT", "3306")),
    "database": os.getenv("MYSQLDATABASE"),
    "user": os.getenv("MYSQLUSER"),
    "password": os.getenv("MYSQLPASSWORD"),
    "charset": "utf8mb4",
    "autocommit": True,
}

ALLOW_ORIGINS = [
    "http://localhost:5173",  # local dev
    "https://freshgroup-ispsc.vercel.app",  # production frontend
]
