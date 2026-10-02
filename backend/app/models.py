from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False)  # ASESOR/DIRECTOR/JEFE_CANAL/ADMIN
    cod_vend: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # for ASESOR
    desc_area: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # for DIRECTOR
    canal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # for JEFE_CANAL: TIENDAS/VENTA EMPRESA
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="usuario")


class ReglaComision(Base):
    __tablename__ = "reglas_comision"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    desde_pct: Mapped[float] = mapped_column(Float, nullable=False)  # cumplimiento desde %
    hasta_pct: Mapped[float] = mapped_column(Float, nullable=False)  # cumplimiento hasta %
    tasa_comision: Mapped[float] = mapped_column(Float, nullable=False)  # commission rate %
    activa: Mapped[bool] = mapped_column(Boolean, default=True)


class Configuracion(Base):
    __tablename__ = "configuracion"

    clave: Mapped[str] = mapped_column(String(100), primary_key=True)
    valor: Mapped[str] = mapped_column(Text, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True)
    accion: Mapped[str] = mapped_column(String(100), nullable=False)
    recurso: Mapped[str] = mapped_column(String(255), nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    detalle: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    usuario: Mapped[Optional["Usuario"]] = relationship("Usuario", back_populates="audit_logs")
