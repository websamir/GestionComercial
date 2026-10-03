"""
/api/store/* — DIRECTOR dashboard endpoints.
Scope: all vendors in the authenticated director's desc_area.
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.auth import get_current_user, require_roles
from app.models import Usuario
from app.excel_engine import get_engine
from app import metrics

router = APIRouter(prefix="/api/store", tags=["store"])

ALLOWED_ROLES = ("DIRECTOR", "ADMIN")


def _get_store_df(current_user: Usuario):
    engine = get_engine()
    if not engine.is_loaded():
        raise HTTPException(status_code=503, detail="No hay datos cargados. Contacte al administrador.")
    desc_area = current_user.desc_area
    if not desc_area and current_user.rol != "ADMIN":
        raise HTTPException(status_code=400, detail="Este usuario no tiene tienda asignada.")
    if desc_area:
        return engine.filter_by_store(desc_area)
    return engine.get_df()


def _apply_date_filter(df, fecha_inicio: Optional[date], fecha_fin: Optional[date]):
    if "fecha_hora" not in df.columns:
        return df
    if fecha_inicio:
        df = df[df["fecha_hora"].dt.date >= fecha_inicio]
    if fecha_fin:
        df = df[df["fecha_hora"].dt.date <= fecha_fin]
    return df


@router.get("/dashboard")
async def store_dashboard(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
):
    df = _get_store_df(current_user)
    df = _apply_date_filter(df, fecha_inicio, fecha_fin)
    summary = metrics.get_sales_summary(df)
    productivity = metrics.get_daily_productivity(df)
    return {
        "tienda": current_user.desc_area or "Empresa",
        "director": current_user.nombre,
        "kpis": {
            "venta": summary["venta_total"],
            "meta": summary["ppto"],
            "cumplimiento": summary["cumplimiento_pct"],
            "margen_pct": summary["margen_pct"],
            "margen_cop": summary["utilidad_total"],
            "facturas": summary["facturas"],
            "facturas_dia": productivity.get("facturas_dia", 0),
            "clientes": summary["clientes"],
            "ticket_promedio": summary["ticket_promedio"],
            "items_factura": summary["items_por_factura"],
            "unidades": summary["unidades"],
            "dias_trabajados": productivity.get("dias_con_ventas", 0),
            "faltan": summary["faltante"],
        },
        "ventas_diarias": metrics.get_sales_by_day(df),
        "asesores": metrics.get_advisors_for_director(df),
        "marcas": [
            {"marca": b["descripcion_grupo"], "venta": b["venta"], "participacion": b["participacion_pct"], "margen_pct": b["margen_pct"]}
            for b in metrics.get_sales_by_brand(df)[:10]
        ],
        "top_productos": [
            {"descripcion": p["descripcion"], "venta": p["venta"],
             "margen_pct": p["margen_pct"], "unidades": p["unidades"],
             "cod_prod": str(p.get("codigo", ""))}
            for p in metrics.get_sales_by_product(df, limit=10)
        ],
        "distribucion_horaria": metrics.get_sales_by_hour(df),
    }


@router.get("/advisors")
async def store_advisors(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_store_df(current_user)
    return metrics.get_advisors_for_director(df)


@router.get("/advisor/{cod_vend}")
async def store_advisor_detail(
    cod_vend: int,
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    engine = get_engine()
    if not engine.is_loaded():
        raise HTTPException(status_code=503, detail="No hay datos cargados.")

    # Security: Director can only view vendors in their own store
    if current_user.rol == "DIRECTOR":
        store_df = engine.filter_by_store(current_user.desc_area)
        if cod_vend not in store_df["cod_vend"].values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este vendedor no pertenece a su tienda.",
            )

    vendor_df = engine.filter_by_vendor(cod_vend)
    if vendor_df.empty:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado.")

    return {
        "vendedor": {
            "cod_vend": cod_vend,
            "nombre_vend": vendor_df["nombre_vend"].iloc[0] if not vendor_df.empty else None,
            "desc_area": vendor_df["desc_area"].iloc[0] if not vendor_df.empty else None,
        },
        "resumen": metrics.get_sales_summary(vendor_df),
        "por_marca": metrics.get_sales_by_brand(vendor_df),
        "por_producto": metrics.get_sales_by_product(vendor_df),
        "clientes": metrics.get_customer_metrics(vendor_df),
        "productividad": metrics.get_daily_productivity(vendor_df),
    }


@router.get("/brands")
async def store_brands(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_store_df(current_user)
    return metrics.get_sales_by_brand(df)


@router.get("/products")
async def store_products(
    current_user: Usuario = Depends(require_roles(*ALLOWED_ROLES)),
):
    df = _get_store_df(current_user)
    return metrics.get_sales_by_product(df)
