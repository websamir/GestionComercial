import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "invesakk-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./invesakk.db")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

_cors_env = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

EXCEL_SHEET_NAME = "v_ventas_vendedores_ppto"

VIRTUAL_BODEGAS = {54, 57, 58, 59, 61, 63, 66}

ROLES = {
    "ASESOR": "ASESOR",
    "DIRECTOR": "DIRECTOR",
    "JEFE_CANAL": "JEFE_CANAL",
    "ADMIN": "ADMIN",
}
