"""
metrics.py: All KPI/metric calculations from a (pre-filtered) pandas DataFrame.

Convention:
- All functions accept a DataFrame that may include rows without sales (Bodega=NaN).
- Sales aggregations always filter to rows where Bodega is NOT NaN (has sales).
- Budget rows (Bodega=NaN) are used only for ppto/compliance metrics.
"""
import pandas as pd
import numpy as np
from typing import Optional
from app.config import VIRTUAL_BODEGAS


def _sales_df(df: pd.DataFrame) -> pd.DataFrame:
    """Return only rows that have actual sales (Bodega not null)."""
    return df[df["Bodega"].notna()].copy()


def _safe_float(val) -> float:
    """Convert to float, returning 0.0 for NaN/None."""
    try:
        v = float(val)
        return 0.0 if (np.isnan(v) or np.isinf(v)) else v
    except (TypeError, ValueError):
        return 0.0


def _safe_pct(numerator, denominator) -> float:
    """Return percentage, 0.0 if denominator is 0."""
    n = _safe_float(numerator)
    d = _safe_float(denominator)
    return round((n / d) * 100, 2) if d != 0 else 0.0


def get_sales_summary(df: pd.DataFrame) -> dict:
    """
    Returns overall KPIs for the given (filtered) DataFrame.
    Includes budget rows for ppto/compliance metrics.
    """
    # Budget: max ppto per vendor (each vendor has constant ppto)
    ppto = _safe_float(df.groupby("cod_vend")["ppto"].first().sum())

    sdf = _sales_df(df)

    venta_total = _safe_float(sdf["Valor Ventas Netas"].sum())
    utilidad_total = _safe_float(sdf["Valor Utilidad"].sum())
    unidades = _safe_float(sdf["Cantidad Venta Neta"].sum())
    margen_pct = _safe_pct(utilidad_total, venta_total)

    # Distinct invoices by document number
    facturas = int(sdf["Número Documento"].nunique()) if "Número Documento" in sdf.columns else 0

    ticket_promedio = _safe_float(venta_total / facturas) if facturas > 0 else 0.0

    # Items per invoice: average number of line items per invoice number
    if facturas > 0 and "Número Documento" in sdf.columns:
        items_por_factura = round(len(sdf.dropna(subset=["Número Documento"])) / facturas, 2)
    else:
        items_por_factura = 0.0

    clientes = int(sdf["Tercero"].nunique()) if "Tercero" in sdf.columns else 0

    cumplimiento_pct = _safe_pct(venta_total, ppto)
    faltante = max(0.0, ppto - venta_total)

    return {
        "venta_total": round(venta_total, 2),
        "utilidad_total": round(utilidad_total, 2),
        "margen_pct": margen_pct,
        "facturas": facturas,
        "ticket_promedio": round(ticket_promedio, 2),
        "items_por_factura": items_por_factura,
        "clientes": clientes,
        "unidades": round(unidades, 2),
        "ppto": round(ppto, 2),
        "cumplimiento_pct": cumplimiento_pct,
        "faltante": round(faltante, 2),
    }


def get_sales_by_brand(df: pd.DataFrame) -> list[dict]:
    """Group sales by brand (Descripción Grupo)."""
    sdf = _sales_df(df)
    if sdf.empty or "Descripción Grupo" not in sdf.columns:
        return []

    total_venta = _safe_float(sdf["Valor Ventas Netas"].sum())

    grouped = sdf.groupby("Descripción Grupo", dropna=False).agg(
        venta=("Valor Ventas Netas", "sum"),
        utilidad=("Valor Utilidad", "sum"),
        unidades=("Cantidad Venta Neta", "sum"),
    ).reset_index()

    result = []
    for _, row in grouped.iterrows():
        venta = _safe_float(row["venta"])
        utilidad = _safe_float(row["utilidad"])
        result.append({
            "descripcion_grupo": row["Descripción Grupo"] if pd.notna(row["Descripción Grupo"]) else "Sin Grupo",
            "venta": round(venta, 2),
            "utilidad": round(utilidad, 2),
            "margen_pct": _safe_pct(utilidad, venta),
            "unidades": round(_safe_float(row["unidades"]), 2),
            "participacion_pct": _safe_pct(venta, total_venta),
        })

    return sorted(result, key=lambda x: x["venta"], reverse=True)


def get_sales_by_product(df: pd.DataFrame, limit: int = 20) -> list[dict]:
    """Top products by net sales."""
    sdf = _sales_df(df)
    if sdf.empty or "Código Item" not in sdf.columns:
        return []

    grouped = sdf.groupby(["Código Item", "Descripción Item"], dropna=False).agg(
        venta=("Valor Ventas Netas", "sum"),
        utilidad=("Valor Utilidad", "sum"),
        unidades=("Cantidad Venta Neta", "sum"),
    ).reset_index()

    result = []
    for _, row in grouped.iterrows():
        venta = _safe_float(row["venta"])
        utilidad = _safe_float(row["utilidad"])
        codigo = row["Código Item"]
        result.append({
            "codigo": int(codigo) if pd.notna(codigo) else None,
            "descripcion": row["Descripción Item"] if pd.notna(row.get("Descripción Item")) else "Sin descripción",
            "venta": round(venta, 2),
            "utilidad": round(utilidad, 2),
            "margen_pct": _safe_pct(utilidad, venta),
            "unidades": round(_safe_float(row["unidades"]), 2),
        })

    result.sort(key=lambda x: x["venta"], reverse=True)
    return result[:limit]


def get_sales_by_store(df: pd.DataFrame) -> list[dict]:
    """Group sales by warehouse/store (Descripción Bodega)."""
    sdf = _sales_df(df)
    if sdf.empty or "Descripción Bodega" not in sdf.columns:
        return []

    grouped = sdf.groupby("Descripción Bodega", dropna=False).agg(
        venta=("Valor Ventas Netas", "sum"),
        facturas=("Número Documento", "nunique"),
        clientes=("Tercero", "nunique"),
    ).reset_index()

    result = []
    for _, row in grouped.iterrows():
        result.append({
            "descripcion_bodega": row["Descripción Bodega"] if pd.notna(row["Descripción Bodega"]) else "Sin Bodega",
            "venta": round(_safe_float(row["venta"]), 2),
            "facturas": int(row["facturas"]),
            "clientes": int(row["clientes"]),
        })

    return sorted(result, key=lambda x: x["venta"], reverse=True)


def get_sales_by_hour(df: pd.DataFrame) -> list[dict]:
    """Group sales by hour of day."""
    sdf = _sales_df(df)
    if sdf.empty or "fecha_hora" not in sdf.columns:
        return []

    sdf = sdf.dropna(subset=["fecha_hora"]).copy()
    sdf["hora"] = sdf["fecha_hora"].dt.hour

    grouped = sdf.groupby("hora").agg(
        facturas=("Número Documento", "nunique"),
        venta=("Valor Ventas Netas", "sum"),
    ).reset_index()

    result = []
    for _, row in grouped.iterrows():
        facturas = int(row["facturas"])
        venta = _safe_float(row["venta"])
        result.append({
            "hora": int(row["hora"]),
            "facturas": facturas,
            "venta": round(venta, 2),
            "ticket": round(venta / facturas, 2) if facturas > 0 else 0.0,
        })

    return sorted(result, key=lambda x: x["hora"])


def get_sales_by_day(df: pd.DataFrame) -> list[dict]:
    """Group sales by calendar day."""
    sdf = _sales_df(df)
    if sdf.empty or "fecha_hora" not in sdf.columns:
        return []

    sdf = sdf.dropna(subset=["fecha_hora"]).copy()
    sdf["fecha"] = sdf["fecha_hora"].dt.date

    grouped = sdf.groupby("fecha").agg(
        venta=("Valor Ventas Netas", "sum"),
        facturas=("Número Documento", "nunique"),
    ).reset_index()

    result = []
    for _, row in grouped.iterrows():
        result.append({
            "fecha": str(row["fecha"]),
            "venta": round(_safe_float(row["venta"]), 2),
            "facturas": int(row["facturas"]),
        })

    return sorted(result, key=lambda x: x["fecha"])


def get_daily_productivity(df: pd.DataFrame) -> dict:
    """Daily average productivity metrics."""
    sdf = _sales_df(df)
    if sdf.empty or "fecha_hora" not in sdf.columns:
        return {
            "facturas_dia": 0.0,
            "ticket_promedio": 0.0,
            "items_por_factura": 0.0,
            "clientes_dia": 0.0,
        }

    sdf = sdf.dropna(subset=["fecha_hora"]).copy()
    sdf["fecha"] = sdf["fecha_hora"].dt.date
    dias = sdf["fecha"].nunique()

    if dias == 0:
        return {
            "facturas_dia": 0.0,
            "ticket_promedio": 0.0,
            "items_por_factura": 0.0,
            "clientes_dia": 0.0,
        }

    facturas_total = sdf["Número Documento"].nunique()
    venta_total = _safe_float(sdf["Valor Ventas Netas"].sum())
    clientes_total = sdf["Tercero"].nunique()

    ticket_promedio = venta_total / facturas_total if facturas_total > 0 else 0.0
    items_por_factura = len(sdf.dropna(subset=["Número Documento"])) / facturas_total if facturas_total > 0 else 0.0

    return {
        "facturas_dia": round(facturas_total / dias, 2),
        "ticket_promedio": round(ticket_promedio, 2),
        "items_por_factura": round(items_por_factura, 2),
        "clientes_dia": round(clientes_total / dias, 2),
        "dias_con_ventas": dias,
    }


def get_vendor_list(df: pd.DataFrame) -> list[dict]:
    """List of vendors with their KPIs (for director/admin views)."""
    vendors = df.groupby("cod_vend").agg(
        nombre_vend=("nombre_vend", "first"),
        desc_area=("desc_area", "first"),
        ppto=("ppto", "first"),
    ).reset_index()

    result = []
    for _, vrow in vendors.iterrows():
        cod = vrow["cod_vend"]
        vdf = df[df["cod_vend"] == cod]
        sdf = _sales_df(vdf)

        ppto = _safe_float(vrow["ppto"])
        venta = _safe_float(sdf["Valor Ventas Netas"].sum())
        utilidad = _safe_float(sdf["Valor Utilidad"].sum())
        facturas = int(sdf["Número Documento"].nunique()) if not sdf.empty else 0
        clientes = int(sdf["Tercero"].nunique()) if not sdf.empty else 0

        result.append({
            "cod_vend": int(cod) if pd.notna(cod) else None,
            "nombre_vend": vrow["nombre_vend"],
            "desc_area": vrow["desc_area"],
            "ppto": round(ppto, 2),
            "venta_total": round(venta, 2),
            "utilidad_total": round(utilidad, 2),
            "margen_pct": _safe_pct(utilidad, venta),
            "cumplimiento_pct": _safe_pct(venta, ppto),
            "facturas": facturas,
            "clientes": clientes,
        })

    return sorted(result, key=lambda x: x["venta_total"], reverse=True)


def get_sales_by_channel(df: pd.DataFrame) -> list[dict]:
    """
    Sales breakdown by channel:
    - VENDEDOR vs CANAL (Origen)
    - Physical vs Virtual warehouse
    """
    sdf = _sales_df(df)
    if sdf.empty:
        return []

    # By Origen
    origen_grouped = sdf.groupby("Origen", dropna=False).agg(
        venta=("Valor Ventas Netas", "sum"),
        facturas=("Número Documento", "nunique"),
        clientes=("Tercero", "nunique"),
    ).reset_index()

    # Virtual vs physical
    if "Bodega" in sdf.columns:
        sdf["es_virtual"] = sdf["Bodega"].isin(VIRTUAL_BODEGAS)
        canal_result = []
        for _, row in origen_grouped.iterrows():
            canal_result.append({
                "origen": row["Origen"] if pd.notna(row["Origen"]) else "DESCONOCIDO",
                "venta": round(_safe_float(row["venta"]), 2),
                "facturas": int(row["facturas"]),
                "clientes": int(row["clientes"]),
            })

        virtual_venta = _safe_float(sdf[sdf["es_virtual"]]["Valor Ventas Netas"].sum())
        physical_venta = _safe_float(sdf[~sdf["es_virtual"]]["Valor Ventas Netas"].sum())

        canal_result.append({"origen": "VIRTUAL", "venta": round(virtual_venta, 2)})
        canal_result.append({"origen": "FISICO", "venta": round(physical_venta, 2)})
        return canal_result

    return []


def get_customer_metrics(df: pd.DataFrame) -> dict:
    """Customer-level metrics."""
    sdf = _sales_df(df)
    if sdf.empty:
        return {
            "clientes_total": 0,
            "venta_por_cliente": 0.0,
            "ticket_promedio": 0.0,
            "top_clientes": [],
        }

    venta_total = _safe_float(sdf["Valor Ventas Netas"].sum())
    clientes_total = int(sdf["Tercero"].nunique())
    facturas = int(sdf["Número Documento"].nunique())

    venta_por_cliente = venta_total / clientes_total if clientes_total > 0 else 0.0
    ticket_promedio = venta_total / facturas if facturas > 0 else 0.0

    # Top clients
    top = (
        sdf.groupby(["Tercero", "Nombre Tercero"], dropna=False)
        .agg(venta=("Valor Ventas Netas", "sum"), facturas=("Número Documento", "nunique"))
        .reset_index()
        .sort_values("venta", ascending=False)
        .head(10)
    )

    top_clientes = []
    for _, row in top.iterrows():
        nit = row["Tercero"]
        top_clientes.append({
            "tercero": int(nit) if pd.notna(nit) else None,
            "nombre": row["Nombre Tercero"] if pd.notna(row.get("Nombre Tercero")) else "Sin nombre",
            "venta": round(_safe_float(row["venta"]), 2),
            "facturas": int(row["facturas"]),
        })

    return {
        "clientes_total": clientes_total,
        "venta_por_cliente": round(venta_por_cliente, 2),
        "ticket_promedio": round(ticket_promedio, 2),
        "top_clientes": top_clientes,
    }


def estimate_commission(df: pd.DataFrame, rules: list[dict]) -> dict:
    """
    Estimate commission for a vendor given commission rules.
    rules: list of {desde_pct, hasta_pct, tasa_comision}
    """
    summary = get_sales_summary(df)
    cumplimiento = summary["cumplimiento_pct"]
    venta = summary["venta_total"]

    commission_rate = 0.0
    applicable_rule = None
    for rule in sorted(rules, key=lambda r: r["desde_pct"]):
        if rule.get("activa", True) and rule["desde_pct"] <= cumplimiento <= rule["hasta_pct"]:
            commission_rate = rule["tasa_comision"]
            applicable_rule = rule
            break

    comision_estimada = venta * (commission_rate / 100)

    return {
        "cumplimiento_pct": cumplimiento,
        "venta_total": venta,
        "ppto": summary["ppto"],
        "tasa_comision_pct": commission_rate,
        "comision_estimada": round(comision_estimada, 2),
        "regla_aplicada": applicable_rule,
    }


def get_advisors_for_director(df: pd.DataFrame) -> list[dict]:
    """
    Per-vendor KPIs for the director's advisors table.
    Returns fields matching AdvisorRow in frontend types.
    """
    vendors = df.groupby("cod_vend").agg(
        nombre=("nombre_vend", "first"),
        ppto=("ppto", "first"),
    ).reset_index()

    result = []
    for _, vrow in vendors.iterrows():
        cod = vrow["cod_vend"]
        vdf = df[df["cod_vend"] == cod]
        sdf = _sales_df(vdf)

        ppto = _safe_float(vrow["ppto"])
        venta = _safe_float(sdf["Valor Ventas Netas"].sum()) if not sdf.empty else 0.0
        utilidad = _safe_float(sdf["Valor Utilidad"].sum()) if not sdf.empty else 0.0
        facturas = int(sdf["Número Documento"].nunique()) if not sdf.empty else 0
        clientes = int(sdf["Tercero"].nunique()) if not sdf.empty else 0

        # Days with sales for facturas_dia
        dias = 0
        if not sdf.empty and "fecha_hora" in sdf.columns:
            dias = sdf["fecha_hora"].dropna().dt.date.nunique()
        facturas_dia = round(facturas / dias, 2) if dias > 0 else 0.0
        ticket_promedio = round(venta / facturas, 2) if facturas > 0 else 0.0

        result.append({
            "cod_vend": int(cod) if pd.notna(cod) else None,
            "nombre": str(vrow["nombre"]) if pd.notna(vrow["nombre"]) else "",
            "venta": round(venta, 2),
            "meta": round(ppto, 2),
            "cumplimiento": _safe_pct(venta, ppto),
            "margen_pct": _safe_pct(utilidad, venta),
            "facturas_dia": facturas_dia,
            "ticket_promedio": ticket_promedio,
            "clientes": clientes,
        })

    return sorted(result, key=lambda x: x["venta"], reverse=True)


def get_store_breakdown(df: pd.DataFrame) -> list[dict]:
    """
    Per-store KPIs for the company dashboard stores ranking.
    Groups by desc_area (store name).
    Returns fields matching StoreRow in frontend types.
    """
    sdf = _sales_df(df)
    stores = df["desc_area"].dropna().unique()

    result = []
    for area in stores:
        area_df = df[df["desc_area"] == area]
        area_sdf = sdf[sdf["desc_area"] == area] if not sdf.empty else pd.DataFrame()

        # ppto: one value per vendor (same as get_sales_summary)
        ppto = _safe_float(area_df.groupby("cod_vend")["ppto"].first().sum())
        venta = _safe_float(area_sdf["Valor Ventas Netas"].sum()) if not area_sdf.empty else 0.0
        utilidad = _safe_float(area_sdf["Valor Utilidad"].sum()) if not area_sdf.empty else 0.0
        facturas = int(area_sdf["Número Documento"].nunique()) if not area_sdf.empty else 0
        asesores = int(df[df["desc_area"] == area]["cod_vend"].nunique())

        ticket = round(venta / facturas, 2) if facturas > 0 else 0.0
        result.append({
            "tienda": str(area),
            "venta": round(venta, 2),
            "meta": round(ppto, 2),
            "cumplimiento": _safe_pct(venta, ppto),
            "margen_pct": _safe_pct(utilidad, venta),
            "facturas": facturas,
            "ticket_promedio": ticket,
            "asesores": asesores,
        })

    return sorted(result, key=lambda x: x["venta"], reverse=True)


def get_channel_breakdown(df: pd.DataFrame) -> list[dict]:
    """
    Per-channel KPIs for the company dashboard.
    Channels: TIENDAS (Origen=VENDEDOR) and VENTA EMPRESA (Origen=CANAL).
    Returns fields matching ChannelKPIs in frontend types.
    """
    channels = [
        ("Tiendas", df[df["Origen"] == "VENDEDOR"]),
        ("Venta Empresa", df[df["Origen"] == "CANAL"]),
    ]

    result = []
    for canal_name, cdf in channels:
        if cdf.empty:
            continue
        summary = get_sales_summary(cdf)
        prod = get_daily_productivity(cdf)
        asesores = int(cdf["cod_vend"].nunique())
        result.append({
            "canal": canal_name,
            "venta": summary["venta_total"],
            "meta": summary["ppto"],
            "cumplimiento": summary["cumplimiento_pct"],
            "margen_pct": summary["margen_pct"],
            "facturas": summary["facturas"],
            "asesores": asesores,
        })

    return result


def get_top_advisors(df: pd.DataFrame, limit: int = 10) -> list[dict]:
    """
    Top advisors by venta for the company dashboard.
    Returns fields matching TopAsesor in frontend types.
    """
    vendors = df.groupby("cod_vend").agg(
        nombre=("nombre_vend", "first"),
        desc_area=("desc_area", "first"),
        ppto=("ppto", "first"),
    ).reset_index()

    result = []
    for _, vrow in vendors.iterrows():
        cod = vrow["cod_vend"]
        vdf = _sales_df(df[df["cod_vend"] == cod])
        ppto = _safe_float(vrow["ppto"])
        venta = _safe_float(vdf["Valor Ventas Netas"].sum()) if not vdf.empty else 0.0
        utilidad = _safe_float(vdf["Valor Utilidad"].sum()) if not vdf.empty else 0.0
        facturas = int(vdf["Número Documento"].nunique()) if not vdf.empty else 0
        ticket = round(venta / facturas, 2) if facturas > 0 else 0.0
        result.append({
            "cod_vend": int(cod) if pd.notna(cod) else None,
            "nombre": str(vrow["nombre"]) if pd.notna(vrow["nombre"]) else "",
            "tienda": str(vrow["desc_area"]) if pd.notna(vrow["desc_area"]) else "",
            "venta": round(venta, 2),
            "cumplimiento": _safe_pct(venta, ppto),
            "margen_pct": _safe_pct(utilidad, venta),
            "facturas": facturas,
            "ticket_promedio": ticket,
        })

    result.sort(key=lambda x: x["venta"], reverse=True)
    return result[:limit]


def get_convenios_breakdown(df: pd.DataFrame) -> dict:
    """
    Convenios (Compra Eficiente) breakdown by client company.
    Segments the CONVENIOS rows and groups by Nombre Tercero.
    """
    sdf = _sales_df(df)
    if sdf.empty:
        return {"total": 0.0, "participacion_top": 0.0, "empresas": []}

    tipo = sdf["Descripción Tipo"].fillna("")
    seg = sdf[tipo.str.contains("CONVENIOS", case=False)]

    if seg.empty:
        return {"total": 0.0, "participacion_top": 0.0, "empresas": []}

    total_venta = _safe_float(seg["Valor Ventas Netas"].sum())
    total_facturas = int(seg["Número Documento"].nunique())

    # Group by client company name
    nombre_col = "Nombre Tercero" if "Nombre Tercero" in seg.columns else "Tercero"
    grouped = seg.groupby(nombre_col, dropna=False).agg(
        venta=("Valor Ventas Netas", "sum"),
        facturas=("Número Documento", "nunique"),
    ).reset_index()

    empresas = []
    for _, row in grouped.iterrows():
        venta = _safe_float(row["venta"])
        facturas = int(row["facturas"])
        nombre = row[nombre_col]
        empresas.append({
            "empresa": str(nombre) if pd.notna(nombre) else "Sin nombre",
            "venta": round(venta, 2),
            "facturas": facturas,
            "ticket_promedio": round(venta / facturas, 2) if facturas > 0 else 0.0,
            "participacion_pct": _safe_pct(venta, total_venta),
        })

    empresas.sort(key=lambda x: x["venta"], reverse=True)

    # % of total that belongs to the top company
    top_pct = empresas[0]["participacion_pct"] if empresas else 0.0

    return {
        "total": round(total_venta, 2),
        "facturas": total_facturas,
        "top_empresa_pct": top_pct,
        "empresas": empresas,
    }


def get_top_advisors_by_channel(df: pd.DataFrame) -> dict:
    """
    Top advisors split by the 5 fixed business channels.

    Canal mapping (by Descripción Tipo pattern):
    - compra_eficiente:   CONVENIOS
    - tiendas:            FE / FACT FE  (Origen VENDEDOR, physical invoices)
    - venta_empresa:      Origen CANAL, excluding PLATAM
    - tienda_virtual_edo: PLATAM
    - ebusiness:          ADDI
    """
    sdf = _sales_df(df)
    empty = []

    if sdf.empty:
        return {
            "compra_eficiente": empty,
            "tiendas": empty,
            "venta_empresa": empty,
            "tienda_virtual_edo": empty,
            "ebusiness": empty,
        }

    # ppto lookup from the full df (budget rows have Bodega=NaN)
    ppto_lookup = df.groupby("cod_vend")["ppto"].first()

    tipo = sdf["Descripción Tipo"].fillna("")

    seg_compra   = sdf[tipo.str.contains("CONVENIOS", case=False)]
    seg_tiendas  = sdf[(sdf["Origen"] == "VENDEDOR") &
                       tipo.str.contains(r"\bFE\b|FACT FE|FACTURAS FE|FACTURA FE|FACT\s+FE", case=False, regex=True) &
                       ~tipo.str.contains("CONVENIOS", case=False)]
    seg_empresa  = sdf[(sdf["Origen"] == "CANAL") & ~tipo.str.contains("PLATAM", case=False)]
    seg_platam   = sdf[tipo.str.contains("PLATAM", case=False)]
    seg_addi     = sdf[tipo.str.contains("ADDI", case=False)]

    def _top(seg: pd.DataFrame) -> list[dict]:
        if seg.empty:
            return []
        vendors = seg.groupby("cod_vend").agg(
            nombre=("nombre_vend", "first"),
            desc_area=("desc_area", "first"),
        ).reset_index()
        result = []
        for _, vrow in vendors.iterrows():
            cod = vrow["cod_vend"]
            vdf = seg[seg["cod_vend"] == cod]
            if vdf.empty:
                continue
            venta = _safe_float(vdf["Valor Ventas Netas"].sum())
            utilidad = _safe_float(vdf["Valor Utilidad"].sum())
            facturas = int(vdf["Número Documento"].nunique())
            ppto = _safe_float(ppto_lookup.get(cod, 0))
            ticket = round(venta / facturas, 2) if facturas > 0 else 0.0
            result.append({
                "cod_vend": int(cod) if pd.notna(cod) else None,
                "nombre": str(vrow["nombre"]) if pd.notna(vrow["nombre"]) else "",
                "tienda": str(vrow["desc_area"]) if pd.notna(vrow["desc_area"]) else "",
                "venta": round(venta, 2),
                "cumplimiento": _safe_pct(venta, ppto),
                "margen_pct": _safe_pct(utilidad, venta),
                "facturas": facturas,
                "ticket_promedio": ticket,
            })
        result = [r for r in result if r["venta"] > 0]
        result.sort(key=lambda x: x["venta"], reverse=True)
        return result

    return {
        "compra_eficiente": _top(seg_compra),
        "tiendas": _top(seg_tiendas),
        "venta_empresa": _top(seg_empresa),
        "tienda_virtual_edo": _top(seg_platam),
        "ebusiness": _top(seg_addi),
    }
