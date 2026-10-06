from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from app.database import get_db
from app.auth import (
    authenticate_user,
    create_access_token,
    build_token_claims,
    get_current_user,
)
from app.models import Usuario, AuditLog
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, form: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, form.email, form.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    claims = build_token_claims(user)
    token = create_access_token(claims, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

    try:
        log = AuditLog(
            usuario_id=user.id,
            accion="LOGIN",
            recurso="auth",
            ip=request.client.host if request.client else None,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "rol": user.rol,
            "cod_vend": user.cod_vend,
            "desc_area": user.desc_area,
            "canal": user.canal,
        },
    )


@router.post("/logout")
async def logout(current_user: Usuario = Depends(get_current_user)):
    # JWT is stateless; client should discard the token
    return {"message": "Sesión cerrada exitosamente"}


@router.get("/me")
async def me(current_user: Usuario = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "email": current_user.email,
        "rol": current_user.rol,
        "cod_vend": current_user.cod_vend,
        "desc_area": current_user.desc_area,
        "canal": current_user.canal,
        "activo": current_user.activo,
    }
