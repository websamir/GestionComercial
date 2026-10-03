"""
ExcelEngine: Singleton for loading and caching the Excel sales DataFrame.
Thread-safe read access via threading.Lock.
"""
import threading
import os
from datetime import datetime
from typing import Optional
import pandas as pd
from app.config import EXCEL_SHEET_NAME


# Expected column names as they appear in the Excel sheet
EXCEL_COLUMNS = [
    "cod_vend",
    "nombre_vend",
    "cedula",
    "celular",
    "area_vend",
    "desc_area",
    "ppto",
    "Bodega",
    "Descripción Bodega",
    "Tipo Documento",
    "Descripción Tipo",
    "Número Documento",
    "fecha_hora",
    "ciudad",
    "dpto",
    "Código Item",
    "Descripción Item",
    "Tercero",
    "Nombre Tercero",
    "Grupo",
    "Descripción Grupo",
    "Valor Ventas Netas",
    "Cantidad Venta Neta",
    "Valor Utilidad",
    "Origen",
]


class ExcelEngine:
    _instance: Optional["ExcelEngine"] = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._df = None
                    cls._instance._metadata = {}
        return cls._instance

    def load(self, filepath: str) -> dict:
        """Load Excel file and cache the DataFrame. Returns metadata."""
        with self._lock:
            import openpyxl
            wb = openpyxl.load_workbook(filepath, read_only=True)
            available = wb.sheetnames
            wb.close()
            sheet = EXCEL_SHEET_NAME if EXCEL_SHEET_NAME in available else available[0]

            df = pd.read_excel(
                filepath,
                sheet_name=sheet,
                engine="openpyxl",
            )

            # Normalize column names (strip whitespace)
            df.columns = [c.strip() for c in df.columns]

            # Parse fecha_hora as datetime if not already
            if "fecha_hora" in df.columns:
                df["fecha_hora"] = pd.to_datetime(df["fecha_hora"], errors="coerce")

            # Ensure numeric columns are numeric
            numeric_cols = [
                "cod_vend", "area_vend", "ppto", "Bodega",
                "Número Documento", "Código Item", "Tercero",
                "Grupo", "Valor Ventas Netas", "Cantidad Venta Neta", "Valor Utilidad",
            ]
            for col in numeric_cols:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce")

            # Ensure string columns are strings and strip whitespace
            str_cols = [
                "nombre_vend", "celular", "desc_area", "Descripción Bodega",
                "Tipo Documento", "Descripción Tipo", "ciudad", "dpto",
                "Descripción Item", "Nombre Tercero", "Descripción Grupo", "Origen",
            ]
            for col in str_cols:
                if col in df.columns:
                    df[col] = df[col].astype(str).str.strip()
                    df[col] = df[col].replace({"nan": None, "None": None, "": None})

            self._df = df

            filename = os.path.basename(filepath)
            # Try to infer period from filename or from fecha_hora
            periodo = self._infer_periodo(df, filename)
            self._metadata = {
                "filename": filename,
                "filepath": filepath,
                "loaded_at": datetime.utcnow().isoformat(),
                "periodo": periodo,
                "total_rows": len(df),
                "rows_with_sales": int(df["Bodega"].notna().sum()),
                "rows_without_sales": int(df["Bodega"].isna().sum()),
                "vendors_count": int(df["cod_vend"].nunique()),
            }
            return self._metadata

    def _infer_periodo(self, df: pd.DataFrame, filename: str) -> str:
        """Try to infer the period (year-month) from the data or filename."""
        if "fecha_hora" in df.columns:
            dates = df["fecha_hora"].dropna()
            if len(dates) > 0:
                latest = dates.max()
                return latest.strftime("%Y-%m")
        # Fallback: current month
        return datetime.utcnow().strftime("%Y-%m")

    def get_df(self) -> pd.DataFrame:
        """Return the full cached DataFrame."""
        if self._df is None:
            raise ValueError("No hay datos cargados. Por favor suba el archivo Excel.")
        return self._df.copy()

    def is_loaded(self) -> bool:
        return self._df is not None

    def filter_by_vendor(self, cod_vend: int) -> pd.DataFrame:
        """Return rows for a specific vendor."""
        df = self.get_df()
        return df[df["cod_vend"] == cod_vend].copy()

    def filter_by_store(self, desc_area: str) -> pd.DataFrame:
        """Return rows for all vendors in a specific store (desc_area)."""
        df = self.get_df()
        return df[df["desc_area"] == desc_area].copy()

    def filter_by_channel(self, channel_name: str) -> pd.DataFrame:
        """
        Filter by channel. channel_name can be:
        - 'VENDEDOR': Origen == 'VENDEDOR'
        - 'CANAL': Origen == 'CANAL' (VENTA EMPRESA)
        - 'TIENDAS': all physical store vendors (Origen == 'VENDEDOR')
        """
        df = self.get_df()
        if channel_name == "TIENDAS":
            return df[df["Origen"] == "VENDEDOR"].copy()
        return df[df["Origen"] == channel_name].copy()

    def get_vendors(self) -> list[dict]:
        """List unique vendors with their basic info."""
        df = self.get_df()
        cols = ["cod_vend", "nombre_vend", "desc_area", "ppto", "Origen"]
        available = [c for c in cols if c in df.columns]
        summary = (
            df[available]
            .drop_duplicates(subset=["cod_vend"])
            .sort_values("nombre_vend")
        )
        result = []
        for _, row in summary.iterrows():
            result.append({
                "cod_vend": int(row["cod_vend"]) if pd.notna(row.get("cod_vend")) else None,
                "nombre_vend": row.get("nombre_vend"),
                "desc_area": row.get("desc_area"),
                "ppto": float(row["ppto"]) if pd.notna(row.get("ppto")) else 0.0,
                "origen": row.get("Origen"),
            })
        return result

    def get_stores(self) -> list[str]:
        """List unique store names (desc_area values)."""
        df = self.get_df()
        return sorted(df["desc_area"].dropna().unique().tolist())

    def get_status(self) -> dict:
        """Return metadata about the loaded file."""
        if not self.is_loaded():
            return {"loaded": False}
        return {"loaded": True, **self._metadata}


# Module-level singleton accessor
_engine = ExcelEngine()


def get_engine() -> ExcelEngine:
    return _engine
