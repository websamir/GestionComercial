"""
run.py — Bootstrap script for INVESAKK Gestión Comercial backend.

1. Initializes the SQLite database and all tables.
2. Creates a default ADMIN user if none exists.
3. Seeds default commission rules if none exist.
4. Starts the uvicorn server.
"""
import sys
import os

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import init_db, SessionLocal
from app.models import Usuario, ReglaComision, Configuracion
from app.auth import get_password_hash

DEFAULT_ADMIN_EMAIL = "admin@invesakk.com"
DEFAULT_ADMIN_PASSWORD = "admin123"

DEFAULT_RULES = [
    {"nombre": "No cumple", "desde_pct": 0.0, "hasta_pct": 79.99, "tasa_comision": 0.0},
    {"nombre": "Cumplimiento básico", "desde_pct": 80.0, "hasta_pct": 89.99, "tasa_comision": 1.0},
    {"nombre": "Cumplimiento estándar", "desde_pct": 90.0, "hasta_pct": 99.99, "tasa_comision": 1.5},
    {"nombre": "Cumplimiento pleno", "desde_pct": 100.0, "hasta_pct": 109.99, "tasa_comision": 2.0},
    {"nombre": "Supera meta", "desde_pct": 110.0, "hasta_pct": 999.0, "tasa_comision": 2.5},
]

DEFAULT_CONFIG = {
    "dias_habiles_mes": "22",
    "empresa_nombre": "INVESAKK SAS",
    "empresa_nit": "802014471-6",
}


def bootstrap():
    print("Inicializando base de datos...")
    init_db()

    db = SessionLocal()
    try:
        # Create default admin
        existing_admin = db.query(Usuario).filter(Usuario.email == DEFAULT_ADMIN_EMAIL).first()
        if not existing_admin:
            admin = Usuario(
                email=DEFAULT_ADMIN_EMAIL,
                password_hash=get_password_hash(DEFAULT_ADMIN_PASSWORD),
                nombre="Administrador INVESAKK",
                rol="ADMIN",
                activo=True,
            )
            db.add(admin)
            db.commit()
            print(f"Usuario admin creado: {DEFAULT_ADMIN_EMAIL} / {DEFAULT_ADMIN_PASSWORD}")
        else:
            print(f"Usuario admin ya existe: {DEFAULT_ADMIN_EMAIL}")

        # Seed commission rules
        if db.query(ReglaComision).count() == 0:
            for rule in DEFAULT_RULES:
                db.add(ReglaComision(activa=True, **rule))
            db.commit()
            print(f"{len(DEFAULT_RULES)} reglas de comisión creadas.")

        # Seed configuration
        for clave, valor in DEFAULT_CONFIG.items():
            existing = db.query(Configuracion).filter(Configuracion.clave == clave).first()
            if not existing:
                db.add(Configuracion(clave=clave, valor=valor))
        db.commit()
        print("Configuración inicial cargada.")

    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn

    bootstrap()

    print("\nIniciando servidor INVESAKK Gestión Comercial...")
    print("URL: http://localhost:8000")
    print("Docs: http://localhost:8000/docs\n")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
