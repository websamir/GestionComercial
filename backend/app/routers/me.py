"""
/api/me/* — ASESOR (vendor) dashboard endpoints.
Scope: always filtered to the authenticated user's cod_vend.
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import Usuario, ReglaComision
from app.excel_engine import get_engine
from app import metrics

router = APIRouter(prefix="/api/me", tags=["me"])

ALLOWED_ROLES = ("ASESOR", "DIRECTOR", "JEFE_CANAL", "ADMIN")


def _get_vendor_df(current_user: Usuario):
    engine = get_engine()
    if not engine.is_loaded():
        raise HTTPException(status_code=503, detail="No hay datos cargados. Contacte al administrador.")
    cod_vend = current_user.cod_vend
    if cod_vend is None:
        raise HTTPException(status_code=400, detail="Este usuario no tiene vendedor asignado.")
    return engine.filter_by_vendor(cod_vend)


def _apply_date_filter(df, fecha_inicio: Optional[date], fecha_fin: Optional[date]):
    if "fecha_hora" not in df.columns:
        return df
    if fecha_inicio:
        df = df[df["fecha_hora"].dt.date >= fecha_inicio]
    if fecha_fin:
        df = df[df["fecha_hora"].dt.date <= fecha_fin]
    return df


@router.get("/dashboard")
async def my_dashboard(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
):
    df = _get_vendor_df(current_user)
    df = _apply_date_filter(df, fecha_inicio, fecha_fin)
    summary = metrics.get_sales_summary(df)
    productivity = metrics.get_daily_productivity(df)
    canal = current_user.canal or "Tiendas"
    return {
        "asesor": {
            "nombre": current_user.nombre,
            "cod_vend": current_user.cod_vend,
            "tienda": current_user.desc_area or "",
            "canal": canal,
        },
        "kpis": {
            "venta": summary.get("venta_total", 0),
            "meta": summary.get("ppto", 0),
            "cumplimiento": summary.get("cumplimiento_pct", 0),
            "margen_pct": summary.get("margen_pct", 0),
            "margen_cop": summary.get("utilidad_total", 0),
            "facturas": summary.get("facturas", 0),
            "facturas_dia": productivity.get("facturas_dia", 0),
            "clientes": summary.get("clientes", 0),
            "ticket_promedio": summary.get("ticket_promedio", 0),
            "items_factura": summary.get("items_por_factura", 0),
            "unidades": summary.get("unidades", 0),
            "dias_trabajados": productivity.get("dias_con_ventas", 0),
            "faltan": summary.get("faltante", 0),
        },
        "ventas_diarias": metrics.get_sales_by_day(df),
        "marcas": [
            {"marca": b.get("descripcion_grupo", ""), "venta": b.get("venta", 0), "participacion": b.get("participacion_pct", 0), "margen_pct": b.get("margen_pct", 0)}
            for b in metrics.get_sales_by_brand(df)[:10]
        ],
        "bodegas": [
            {"bodega": b.get("descripcion_bodega", ""), "venta": b.get("venta", 0), "participacion": b.get("participacion_pct", 0)}
            for b in metrics.get_sales_by_store(df)
        ],
        "top_productos": [
            {"descripcion": p.get("descripcion", ""), "venta": p.get("venta", 0),
             "margen_pct": p.get("margen_pct", 0), "unidades": p.get("unidades", 0),
             "cod_prod": str(p.get("codigo", ""))}
            for p in metrics.get_sales_by_product(df, limit=10)
        ],
        "distribucion_horaria": metrics.get_sales_by_hour(df),
        "convenios": metrics.get_convenios_breakdown(df),
        "canal_venta": metrics.get_virtual_vs_fisica(df),
    }


@router.get("/sales")
async def my_sales(
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_vendor_df(current_user)
    df = _apply_date_filter(df, fecha_inicio, fecha_fin)
    return {
        "resumen": metrics.get_sales_summary(df),
        "por_dia": metrics.get_sales_by_day(df),
        "por_hora": metrics.get_sales_by_hour(df),
    }


@router.get("/products")
async def my_products(
    limit: int = Query(20, ge=1, le=100),
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_vendor_df(current_user)
    return metrics.get_sales_by_product(df, limit=limit)


@router.get("/brands")
async def my_brands(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_vendor_df(current_user)
    return metrics.get_sales_by_brand(df)


@router.get("/customers")
async def my_customers(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_vendor_df(current_user)
    return metrics.get_customer_metrics(df)


@router.get("/productivity")
async def my_productivity(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_vendor_df(current_user)
    return metrics.get_daily_productivity(df)


@router.get("/commission")
async def my_commission(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
    db: Session = Depends(get_db),
):
    df = _get_vendor_df(current_user)
    rules = db.query(ReglaComision).filter(ReglaComision.activa == True).order_by(ReglaComision.desde_pct).all()
    rules_dicts = [
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
    return metrics.estimate_commission(df, rules_dicts)
