"""
Crea usuarios DIRECTOR para todas las tiendas que no tienen director en BD.
Contraseña por defecto: Invesakk2024
Email: director.<tienda_slug>@invesakk.com
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import glob
from app.excel_engine import get_engine
from app.database import SessionLocal
from app.models import Usuario
from app.auth import get_password_hash as hash_password
import unicodedata, re

DEFAULT_PASSWORD = "Invesakk2024"

TIENDAS = [
    "Bogotá",
    "Caribe Verde",
    "Luzkal",
    "Magangué",
    "Malambo",
    "Montería",
    "Plaza",
    "Santo Tomás",
    "Soledad",
    "Valledupar",
    "Bodemayor",
    "Cartagena",
]

# Tiendas a omitir (canales, no tiendas físicas)
OMITIR = {"VENTA EMPRESA"}


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", ".", text)
    return text.strip(".")


def get_tiendas_from_excel():
    files = sorted(glob.glob("uploads/*.xlsx"), key=os.path.getmtime, reverse=True)
    if not files:
        print("ERROR: No se encontró Excel en uploads/")
        sys.exit(1)
    engine = get_engine()
    if not engine.is_loaded():
        engine.load(files[0])
    df = engine.get_df()
    tiendas = sorted(t for t in df["desc_area"].dropna().unique() if t not in OMITIR)
    return tiendas


def main():
    tiendas = get_tiendas_from_excel()
    print(f"Tiendas encontradas: {tiendas}\n")

    db = SessionLocal()
    existentes = {u.desc_area for u in db.query(Usuario).filter(Usuario.rol == "DIRECTOR").all()}
    print(f"Directores ya existentes: {existentes}\n")

    creados = 0
    omitidos = 0

    for tienda in tiendas:
        if tienda in existentes:
            print(f"  SKIP  {tienda} — ya tiene director")
            omitidos += 1
            continue

        slug = slugify(tienda)
        email = f"director.{slug}@invesakk.com"
        nombre = f"Director {tienda}"

        # Check email collision
        if db.query(Usuario).filter(Usuario.email == email).first():
            print(f"  SKIP  {tienda} — email {email} ya existe")
            omitidos += 1
            continue

        user = Usuario(
            email=email,
            nombre=nombre,
            rol="DIRECTOR",
            password_hash=hash_password(DEFAULT_PASSWORD),
            desc_area=tienda,
            activo=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"  CREA  {nombre} | {email} | area={tienda}")
        creados += 1

    db.close()
    print(f"\nResultado: {creados} creados, {omitidos} omitidos")
    print(f"Contraseña por defecto: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    main()
