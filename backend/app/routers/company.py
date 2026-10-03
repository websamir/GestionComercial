"""
/api/company/* — Company-wide / JEFE_CANAL dashboard endpoints.
Scope: ADMIN sees everything; JEFE_CANAL sees their canal only.
"""
from fastapi import APIRouter, Depends, HTTPException
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


@router.get("/dashboard")
async def company_dashboard(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_channel_df(current_user)
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
        "marcas_canales": marcas_canal,
        "marcas": [
            {"marca": b["descripcion_grupo"], "venta": b["venta"], "participacion": b["participacion_pct"]}
            for b in metrics.get_sales_by_brand(df)[:8]
        ],
    }


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
