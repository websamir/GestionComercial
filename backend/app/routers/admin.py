"""
/api/admin/* — Admin-only endpoints.
Handles Excel upload, user management, commission rules.
"""
import os
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.auth import get_current_user, require_roles, get_password_hash
from app.database import get_db
from app.models import Usuario, ReglaComision, AuditLog
from app.excel_engine import get_engine
from app.config import UPLOAD_DIR

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_ONLY = ("ADMIN",)


# ─── Pydantic schemas ───────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    email: str
    password: str
    nombre: str
    rol: str  # ASESOR/DIRECTOR/JEFE_CANAL/ADMIN
    cod_vend: Optional[int] = None
    desc_area: Optional[str] = None
    canal: Optional[str] = None
    activo: bool = True


class UsuarioUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    nombre: Optional[str] = None
    rol: Optional[str] = None
    cod_vend: Optional[int] = None
    desc_area: Optional[str] = None
    canal: Optional[str] = None
    activo: Optional[bool] = None


class ReglaComisionSchema(BaseModel):
    id: Optional[int] = None
    nombre: str
    desde_pct: float
    hasta_pct: float
    tasa_comision: float
    activa: bool = True


# ─── Excel upload ────────────────────────────────────────────────────────────

@router.post("/excel/upload")
async def upload_excel(
    request: Request,
    file: UploadFile = File(...),
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .xlsx")

    # Save with timestamp to preserve history
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    saved_name = f"ventas_{timestamp}_{file.filename}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el archivo: {str(e)}")

    # Reload the engine cache
    engine = get_engine()
    try:
        meta = engine.load(saved_path)
    except Exception as e:
        os.remove(saved_path)
        raise HTTPException(status_code=422, detail=f"Error al procesar el Excel: {str(e)}")

    # Audit log
    log = AuditLog(
        usuario_id=current_user.id,
        accion="UPLOAD_EXCEL",
        recurso=saved_name,
        ip=request.client.host if request.client else None,
        detalle=f"Filas: {meta.get('total_rows')}, Periodo: {meta.get('periodo')}",
    )
    db.add(log)
    db.commit()

    return {
        "mensaje": "Archivo cargado y cache actualizado exitosamente",
        "archivo": saved_name,
        **meta,
    }


@router.get("/excel/status")
async def excel_status(
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
):
    engine = get_engine()
    return engine.get_status()


# ─── Users ───────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
    db: Session = Depends(get_db),
):
    users = db.query(Usuario).order_by(Usuario.nombre).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "nombre": u.nombre,
            "rol": u.rol,
            "cod_vend": u.cod_vend,
            "desc_area": u.desc_area,
            "canal": u.canal,
            "activo": u.activo,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UsuarioCreate,
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
    db: Session = Depends(get_db),
):
    valid_roles = {"ASESOR", "DIRECTOR", "JEFE_CANAL", "ADMIN"}
    if data.rol not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rol inválido. Valores: {valid_roles}")

    existing = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email.")

    user = Usuario(
        email=data.email,
        password_hash=get_password_hash(data.password),
        nombre=data.nombre,
        rol=data.rol,
        cod_vend=data.cod_vend,
        desc_area=data.desc_area,
        canal=data.canal,
        activo=data.activo,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "nombre": user.nombre,
        "rol": user.rol,
        "cod_vend": user.cod_vend,
        "desc_area": user.desc_area,
        "canal": user.canal,
        "activo": user.activo,
        "created_at": user.created_at.isoformat(),
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    data: UsuarioUpdate,
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
    db: Session = Depends(get_db),
):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if data.email is not None:
        user.email = data.email
    if data.password is not None:
        user.password_hash = get_password_hash(data.password)
    if data.nombre is not None:
        user.nombre = data.nombre
    if data.rol is not None:
        user.rol = data.rol
    if data.cod_vend is not None:
        user.cod_vend = data.cod_vend
    if data.desc_area is not None:
        user.desc_area = data.desc_area
    if data.canal is not None:
        user.canal = data.canal
    if data.activo is not None:
        user.activo = data.activo

    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "nombre": user.nombre, "rol": user.rol, "activo": user.activo}


# ─── Vendors from Excel ──────────────────────────────────────────────────────

@router.get("/vendors")
async def list_vendors(
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
):
    engine = get_engine()
    if not engine.is_loaded():
        raise HTTPException(status_code=503, detail="No hay datos cargados.")
    return engine.get_vendors()


# ─── Commission rules ─────────────────────────────────────────────────────────

@router.get("/rules")
async def get_rules(
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
    db: Session = Depends(get_db),
):
    rules = db.query(ReglaComision).order_by(ReglaComision.desde_pct).all()
    return [
        {
            "id": r.id,
            "nombre": r.nombre,
            "desde_pct": r.desde_pct,
            "hasta_pct": r.hasta_pct,
            "tasa_comision": r.tasa_comision,
            "activa": r.activa,
        }
        for r in rules
    ]


@router.put("/rules")
async def update_rules(
    rules: List[ReglaComisionSchema],
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
    db: Session = Depends(get_db),
):
    """Replace all commission rules with the provided list."""
    # Delete existing
    db.query(ReglaComision).delete()

    for r in rules:
        rule = ReglaComision(
            nombre=r.nombre,
            desde_pct=r.desde_pct,
            hasta_pct=r.hasta_pct,
            tasa_comision=r.tasa_comision,
            activa=r.activa,
        )
        db.add(rule)

    db.commit()
    return {"mensaje": f"{len(rules)} reglas actualizadas.", "reglas": len(rules)}


# ─── Stores from Excel ───────────────────────────────────────────────────────

@router.get("/stores")
async def list_stores(
    current_user: Usuario = Depends(require_roles(*ADMIN_ONLY)),
):
    engine = get_engine()
    if not engine.is_loaded():
        raise HTTPException(status_code=503, detail="No hay datos cargados.")
    return engine.get_stores()
