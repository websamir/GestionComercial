"""
Crea usuarios para todos los vendedores del Excel que no existen aún en la BD.
Ejecutar desde: backend/
  python scripts/create_all_users.py
"""
import sys, re
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models import Usuario
from app.auth import get_password_hash
from app.excel_engine import get_engine

DEFAULT_PASSWORD = "Invesakk2024"

def make_email(nombre: str, cod_vend: int, existing_emails: set) -> str:
    clean = re.sub(r'\(.*?\)', '', nombre).strip()
    words = [w.lower() for w in clean.split() if w]
    if len(words) >= 2:
        candidate = f"{words[0]}.{words[-1]}@invesakk.com"
    else:
        candidate = f"{words[0]}@invesakk.com"
    if candidate in existing_emails:
        candidate = f"{words[0]}.{cod_vend}@invesakk.com"
    return candidate

def infer_role(origen: str) -> str:
    return "ASESOR"

def infer_canal(origen: str, desc_area: str) -> str | None:
    if origen == "CANAL":
        return "VENTA EMPRESA"
    return None

import glob, os
engine = get_engine()
if not engine.is_loaded():
    uploads = sorted(glob.glob("uploads/*.xlsx"), key=os.path.getmtime, reverse=True)
    if not uploads:
        print("ERROR: No hay archivos en uploads/.")
        sys.exit(1)
    engine.load(uploads[0])
    print(f"Excel cargado: {uploads[0]}")

vendors = engine.get_vendors()
db = SessionLocal()

existing_emails = {u.email for u in db.query(Usuario).all()}
existing_cods  = {u.cod_vend for u in db.query(Usuario).filter(Usuario.cod_vend.isnot(None)).all()}

created, skipped = [], []

for v in vendors:
    cod  = int(v["cod_vend"])
    nombre = v["nombre_vend"]
    area   = v.get("desc_area") or ""
    origen = v.get("origen") or "VENDEDOR"

    if cod in existing_cods:
        skipped.append(f"  SKIP  cod={cod} ({nombre}) — ya existe")
        continue

    email = make_email(nombre, cod, existing_emails)
    existing_emails.add(email)

    user = Usuario(
        email=email,
        password_hash=get_password_hash(DEFAULT_PASSWORD),
        nombre=nombre.title(),
        rol=infer_role(origen),
        cod_vend=cod,
        desc_area=area if origen == "VENDEDOR" else None,
        canal=infer_canal(origen, area),
        activo=True,
    )
    db.add(user)
    created.append(f"  CREAR cod={cod} {email} ({nombre.title()}) rol=ASESOR")

db.commit()
db.close()

print(f"\n=== Resultado ===")
print(f"Creados : {len(created)}")
print(f"Omitidos: {len(skipped)}")
print("\n".join(created))
print("\n--- Omitidos ---")
print("\n".join(skipped))
print(f"\nContraseña por defecto: {DEFAULT_PASSWORD}")
