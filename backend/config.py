import os
from dotenv import load_dotenv

load_dotenv()  # local dev, Railway ignores this

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "charset": "utf8mb4",
    "autocommit": True,
}

ALLOW_ORIGINS = [
    "http://localhost:5173",  # local dev
    "https://freshgroup-orpin.vercel.app",  # production frontend
]
