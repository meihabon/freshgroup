from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

DB_CONFIG = {
    'host': 'localhost',
    'database': 'freshgroup',
    'user': 'root',
    'password': '',
    'charset': 'utf8mb4',
    'autocommit': True
}

ALLOW_ORIGINS = ["http://localhost:5173"]
