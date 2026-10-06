from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import CORS_ORIGINS
from app.database import init_db
from app.routers import auth, me, store, company, admin

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="INVESAKK Gestión Comercial API",
    description="Backend para el portal comercial de INVESAKK SAS - NIT 802014471-6",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(store.router)
app.include_router(company.router)
app.include_router(admin.router)


@app.on_event("startup")
async def startup():
    init_db()
    import os, glob as _glob
    from app.excel_engine import get_engine
    from app.config import DATABASE_URL

    # 1. Try local Excel file first
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    excel_loaded = False
    if os.path.isdir(upload_dir):
        files = sorted(_glob.glob(os.path.join(upload_dir, "*.xlsx")), key=os.path.getmtime, reverse=True)
        if files:
            try:
                get_engine().load(files[0])
                print(f"[startup] Excel cargado desde disco: {os.path.basename(files[0])}")
                excel_loaded = True
            except Exception as e:
                print(f"[startup] Error cargando Excel local: {e}")

    # 2. If no local file and using PostgreSQL, load from ventas_raw table
    if not excel_loaded and not DATABASE_URL.startswith("sqlite"):
        try:
            meta = get_engine().load_from_db(DATABASE_URL)
            print(f"[startup] Datos cargados desde DB: {meta['total_rows']} filas, periodo {meta['periodo']}")
        except Exception as e:
            print(f"[startup] Error cargando desde DB: {e}")


@app.get("/")
async def root():
    return {
        "app": "INVESAKK Gestión Comercial API",
        "empresa": "INVESAKK SAS",
        "nit": "802014471-6",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/setup-admin")
async def setup_admin(secret: str):
    """Crea el usuario admin inicial. Solo funciona con la clave correcta."""
    import os as _os
    from fastapi import HTTPException
    if secret != _os.getenv("SETUP_SECRET", "invesakk-setup-2024"):
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.database import SessionLocal
    from app.models import Usuario
    from app.auth import get_password_hash
    db = SessionLocal()
    try:
        existing = db.query(Usuario).filter(Usuario.email == "admin@invesakk.com").first()
        if existing:
            existing.password_hash = get_password_hash("Invesakk2024")
            db.commit()
            return {"status": "password_reset", "email": "admin@invesakk.com"}
        u = Usuario(
            email="admin@invesakk.com",
            nombre="Administrador",
            rol="ADMIN",
            password_hash=get_password_hash("Invesakk2024"),
            activo=True,
        )
        db.add(u)
        db.commit()
        return {"status": "creado", "email": "admin@invesakk.com"}
    finally:
        db.close()


@app.get("/health")
async def health():
    from app.excel_engine import get_engine
    engine = get_engine()
    return {
        "status": "ok",
        "excel_loaded": engine.is_loaded(),
        "excel_status": engine.get_status(),
    }
