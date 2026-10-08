"""
/api/company/* — Company-wide / JEFE_CANAL dashboard endpoints.
Scope: ADMIN sees everything; JEFE_CANAL sees their canal only.
"""
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.auth import require_roles
from app.models import Usuario
from app.excel_engine import get_engine
from app import metrics

router = APIRouter(prefix="/api/company", tags=["company"])

ALLOWED_ROLES = ("JEFE_CANAL", "ADMIN")


def _get_channel_df(current_user: Usuario):
    engine = get_engine()
    if not engine.is_loaded():
        raise HTTPException(status_code=503, detail="No hay datos cargados. Contacte al administrador.")

    if current_user.rol == "ADMIN":
        return engine.get_df()

    canal = current_user.canal
    if not canal:
        raise HTTPException(status_code=400, detail="Este usuario no tiene canal asignado.")
    return engine.filter_by_channel(canal)


def _filter_by_dates(df, fecha_inicio: Optional[date], fecha_fin: Optional[date]):
    """Filter df rows by date range on fecha_hora column."""
    import pandas as pd
    if "fecha_hora" not in df.columns:
        return df
    if fecha_inicio is None and fecha_fin is None:
        return df
    mask = pd.Series([True] * len(df), index=df.index)
    if fecha_inicio:
        mask &= df["fecha_hora"].dt.date >= fecha_inicio
    if fecha_fin:
        mask &= df["fecha_hora"].dt.date <= fecha_fin
    return df[mask].copy()


@router.get("/dashboard")
async def company_dashboard(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
):
    df = _get_channel_df(current_user)
    df = _filter_by_dates(df, fecha_inicio, fecha_fin)
    summary = metrics.get_sales_summary(df)
    tops = metrics.get_top_advisors_by_channel(df)
    convenios = metrics.get_convenios_breakdown(df)
    marcas_canal = metrics.get_brands_by_channel(df)
    return {
        "periodo": "",
        "kpis": {
            "venta_total": summary["venta_total"],
            "meta_total": summary["ppto"],
            "cumplimiento": summary["cumplimiento_pct"],
            "margen_pct": summary["margen_pct"],
            "facturas": summary["facturas"],
            "clientes": summary["clientes"],
            "ticket_promedio": summary["ticket_promedio"],
            "items_factura": summary["items_por_factura"],
            "faltan": summary.get("faltante", 0),
        },
        "canales": metrics.get_channel_breakdown(df),
        "tiendas": metrics.get_store_breakdown(df),
        "top_asesores": metrics.get_top_advisors(df, limit=10),
        "top_compra_eficiente": tops["compra_eficiente"],
        "top_tiendas": tops["tiendas"],
        "top_empresa": tops["venta_empresa"],
        "top_tienda_virtual_edo": tops["tienda_virtual_edo"],
        "top_ebusiness": tops["ebusiness"],
        "convenios": convenios,
        "canal_venta": metrics.get_virtual_vs_fisica(df),
        "venta_directa": metrics.get_venta_directa(df),
        "marcas_canales": marcas_canal,
        "marcas": [
            {"marca": b["descripcion_grupo"], "venta": b["venta"], "participacion": b["participacion_pct"]}
            for b in metrics.get_sales_by_brand(df)[:8]
        ],
        "ventas_diarias": [
            {"fecha": d["fecha"], "venta": d["venta"]}
            for d in metrics.get_sales_by_day(df)
        ],
        "ventas_diarias_canal": metrics.get_sales_by_day_per_channel(df),
        "distribucion_horaria": metrics.get_sales_by_hour(df),
    }


@router.get("/convenios-dashboard")
async def company_convenios_dashboard(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
):
    df = _get_channel_df(current_user)
    df = _filter_by_dates(df, fecha_inicio, fecha_fin)
    return metrics.get_convenios_full_dashboard(df)


@router.get("/daily")
async def company_daily(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
):
    df = _get_channel_df(current_user)
    df = _filter_by_dates(df, fecha_inicio, fecha_fin)
    return metrics.get_sales_by_day(df)


@router.get("/channels")
async def company_channels(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_channel_df(current_user)
    return metrics.get_channel_breakdown(df)


@router.get("/stores")
async def company_stores(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_channel_df(current_user)
    return metrics.get_store_breakdown(df)


@router.get("/advisors")
async def company_advisors(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_channel_df(current_user)
    return metrics.get_top_advisors(df)


@router.get("/brands")
async def company_brands(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_channel_df(current_user)
    return metrics.get_sales_by_brand(df)


@router.get("/products")
async def company_products(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_channel_df(current_user)
    return metrics.get_sales_by_product(df)
