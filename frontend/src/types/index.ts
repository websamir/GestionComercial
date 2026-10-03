export type UserRole = 'ASESOR' | 'DIRECTOR' | 'JEFE_CANAL' | 'ADMIN'

export interface User {
  email: string
  nombre: string
  rol: UserRole
  cod_vend?: number
  desc_area?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

// Asesor Dashboard
export interface AsesorKPIs {
  venta: number
  meta: number
  cumplimiento: number
  margen_pct: number
  margen_cop: number
  facturas: number
  facturas_dia: number
  clientes: number
  ticket_promedio: number
  items_factura: number
  unidades: number
  dias_trabajados: number
  faltan: number
}

export interface DailySale {
  fecha: string
  venta: number
  acumulado?: number
}

export interface BrandSale {
  marca: string
  venta: number
  participacion: number
}

export interface BodegaSale {
  bodega: string
  venta: number
  participacion: number
}

export interface ProductRow {
  descripcion: string
  venta: number
  margen_pct: number
  unidades: number
  cod_prod?: string
}

export interface HourlyDistribution {
  hora: number
  facturas: number
  venta: number
}

export interface AsesorDashboardData {
  asesor: {
    nombre: string
    cod_vend: number
    tienda: string
    canal: string
  }
  periodo: string
  kpis: AsesorKPIs
  ventas_diarias: DailySale[]
  marcas: BrandSale[]
  bodegas: BodegaSale[]
  top_productos: ProductRow[]
  distribucion_horaria?: HourlyDistribution[]
}

// Director Dashboard
export interface AdvisorRow {
  cod_vend: number
  nombre: string
  venta: number
  meta: number
  cumplimiento: number
  margen_pct: number
  facturas_dia: number
  ticket_promedio: number
  items_factura: number
  clientes: number
}

export interface DirectorDashboardData {
  tienda: string
  director: string
  periodo: string
  kpis: AsesorKPIs
  ventas_diarias: DailySale[]
  asesores: AdvisorRow[]
  marcas: BrandSale[]
  top_productos: ProductRow[]
  distribucion_horaria: HourlyDistribution[]
}

// Company Dashboard
export interface ChannelKPIs {
  canal: string
  venta: number
  meta: number
  cumplimiento: number
  margen_pct: number
  facturas: number
  asesores: number
}

export interface StoreRow {
  tienda: string
  venta: number
  meta: number
  cumplimiento: number
  margen_pct: number
  facturas: number
  ticket_promedio: number
  asesores: number
}

export interface ConvenioBarra {
  nombre: string
  venta: number
  facturas: number
  clientes: number
  participacion_pct: number
}

export interface ConveniosData {
  total: number
  facturas: number
  barras: ConvenioBarra[]
}

export interface TopAsesor {
  cod_vend: number
  nombre: string
  tienda: string
  facturas: number
  ticket_promedio: number
  items_factura: number
  venta: number
  cumplimiento: number
  margen_pct: number
}

export interface CompanyDashboardData {
  periodo: string
  kpis: {
    venta_total: number
    ticket_promedio: number
    meta_total: number
    cumplimiento: number
    margen_pct: number
    facturas: number
    clientes: number
    items_factura: number
  }
  canales: ChannelKPIs[]
  tiendas: StoreRow[]
  top_asesores: TopAsesor[]
  top_compra_eficiente: TopAsesor[]
  top_tiendas: TopAsesor[]
  top_empresa: TopAsesor[]
  top_tienda_virtual_edo: TopAsesor[]
  top_ebusiness: TopAsesor[]
  convenios: ConveniosData
  marcas: BrandSale[]
  marcas_canales: {
    tiendas: BrandSale[]
    empresa: BrandSale[]
    compra_eficiente: BrandSale[]
    tienda_virtual_edo: BrandSale[]
    ebusiness: BrandSale[]
  }
}

// Admin
export interface AdminUser {
  id: number
  email: string
  nombre: string
  rol: UserRole
  cod_vend?: number
  desc_area?: string
  activo: boolean
}

export interface CreateUserPayload {
  email: string
  nombre: string
  rol: UserRole
  password: string
  cod_vend?: number
  desc_area?: string
  activo?: boolean
}

export interface UploadInfo {
  filename: string
  uploaded_at: string
  rows: number
  periodo?: string
}
