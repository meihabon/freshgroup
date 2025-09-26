from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "frshgrp_5432"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

DB_CONFIG = {
    'host': 'dpg-d3bdshuuk2gs7385aaa0-a',
    'database': 'freshgroup_db',
    'user': 'freshgroup_db_user',
    'password': 'Av77CwIK914ceBhgF8iN884dGGYPc1UD',
    'charset': 'utf8mb4',
    'autocommit': True
}

ALLOW_ORIGINS = ["http://localhost:5173"]
