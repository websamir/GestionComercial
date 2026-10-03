import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import Layout from '../../components/Layout'
import LoadingSpinner from '../../components/LoadingSpinner'
import HourlyChart from '../../components/HourlyChart'
import { getCompanyDashboard } from '../../api/company'
import { useAuthStore } from '../../store/auth'
import type { CompanyDashboardData, TopAsesor, StoreRow, BrandSale } from '../../types'
import { formatCOP } from '../../components/KPICard'

// ─── helpers ────────────────────────────────────────────────────────────────

function getCurrentPeriodo() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function getPrevPeriodo(p: string) {
  const [y, m] = p.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

function fmtM(n: number) {
  if (n >= 1_000_000_000) return `$ ${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$ ${(n / 1_000).toFixed(0)}K`
  return `$ ${n.toFixed(0)}`
}

function getCumplColor(p: number) {
  if (p >= 80) return 'text-green-600'
  if (p >= 60) return 'text-amber-500'
  return 'text-red-500'
}

// ─── mini sparkline ──────────────────────────────────────────────────────────

interface SparkPoint { v: number; label: string }

function Sparkline({ data, color = '#2563EB' }: { data: SparkPoint[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <BarChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }} barCategoryGap="20%">
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── KPI card (new design) ────────────────────────────────────────────────────

const KPI_ICONS: Record<string, { d: string; accent: string; iconColor: string }> = {
  venta:   { d: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',         accent: '#2563EB', iconColor: '#2563EB' },
  meta:    { d: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', accent: '#8B5CF6', iconColor: '#8B5CF6' },
  margen:  { d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',                                accent: '#F97316', iconColor: '#F97316' },
  fact:    { d: 'M9 12h6M9 16h6M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7', accent: '#EC4899', iconColor: '#EC4899' },
  clientes:{ d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8',         accent: '#14B8A6', iconColor: '#14B8A6' },
  ticket:      { d: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', accent: '#EAB308', iconColor: '#CA8A04' },
  ticketitem:  { d: 'M7 7h10M7 12h6M7 17h4M3 3h18v18H3z',                         accent: '#D97706', iconColor: '#B45309' },
  items:       { d: 'M4 6h16M4 10h16M4 14h16M4 18h16',                             accent: '#6366F1', iconColor: '#6366F1' },
  unidades:    { d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10',       accent: '#06B6D4', iconColor: '#06B6D4' },
}

interface KPIProps {
  title: string
  value: string
  subtitle?: string
  trend?: number | null
  iconKey: keyof typeof KPI_ICONS
}

function NewKPICard({ title, value, subtitle, trend, iconKey }: KPIProps) {
  const ico = KPI_ICONS[iconKey]
  const isUp = trend != null && trend > 0
  const isDown = trend != null && trend < 0
  return (
    <div className="rounded-xl shadow-sm p-4 flex flex-col gap-3 overflow-hidden relative"
      style={{ borderBottom: `3px solid ${ico.accent}`, background: `${ico.accent}12` }}>
      <div className="flex items-start justify-between">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ico.iconColor} strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
          <path d={ico.d} />
        </svg>
        {trend != null && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${isUp ? 'text-green-600' : isDown ? 'text-red-500' : 'text-gray-400'}`}>
            {isUp ? '↑' : isDown ? '↓' : '—'}{Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{value}</p>
        <p className="text-xs mt-1.5 font-medium uppercase tracking-wide" style={{ color: ico.iconColor, opacity: 0.8 }}>{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Canal mini-card ──────────────────────────────────────────────────────────

const CANAL_COLORS: Record<string, { line: string; bg: string; dot: string }> = {
  'Tiendas':           { line: '#2563EB', bg: 'bg-blue-50',   dot: 'bg-blue-500' },
  'Venta Empresa':     { line: '#10B981', bg: 'bg-green-50',  dot: 'bg-green-500' },
  'Convenios':         { line: '#8B5CF6', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  'Tienda Virtual':    { line: '#F59E0B', bg: 'bg-amber-50',  dot: 'bg-amber-500' },
  'E-business':        { line: '#EF4444', bg: 'bg-red-50',    dot: 'bg-red-500' },
}

function CanalCard({ canal, venta, cumplimiento, margen_pct, spark }: {
  canal: string; venta: number; cumplimiento: number; margen_pct: number; spark: SparkPoint[]
}) {
  const c = CANAL_COLORS[canal] ?? { line: '#64748B', bg: 'bg-gray-50', dot: 'bg-gray-500' }
  const cumplOk = cumplimiento >= 80
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0`} />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{canal}</span>
        </div>
        <span className={`text-xs font-bold ${cumplOk ? 'text-green-600' : 'text-red-500'}`}>
          Cumpl. {cumplimiento.toFixed(1)}%
        </span>
      </div>
      <p className="text-xl font-bold text-gray-800 mb-0.5">{fmtM(venta)}</p>
      <p className="text-xs text-gray-500 mb-2">Margen {margen_pct.toFixed(1)}%</p>
      <Sparkline data={spark} color={c.line} />
    </div>
  )
}

// ─── Pie chart labels ─────────────────────────────────────────────────────────

const PIE_COLORS = ['#1e40af','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe']

const RADIAN = Math.PI / 180
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Store ranking table ──────────────────────────────────────────────────────

function RankingTiendas({ data }: { data: StoreRow[] }) {
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(8)
  const filtered = data.filter(r => r.tienda.toLowerCase().includes(search.toLowerCase()))
  const visible = filtered.slice(0, limit)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-gray-800">Ranking de Tiendas</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar tienda..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-gray-600 placeholder-gray-400 outline-none w-28"
            />
          </div>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 outline-none cursor-pointer"
          >
            {[5,8,12].map(n => <option key={n} value={n}>Top {n}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 pr-2 font-semibold w-6">#</th>
              <th className="text-left py-2 pr-2 font-semibold">Tienda</th>
              <th className="text-right py-2 pr-2 font-semibold">Venta</th>
              <th className="text-right py-2 pr-2 font-semibold">Cumpl. %</th>
              <th className="text-right py-2 pr-2 font-semibold">Margen %</th>
              <th className="text-right py-2 pr-2 font-semibold">Facturas</th>
              <th className="text-right py-2 pr-2 font-semibold">Ticket $</th>
              <th className="text-right py-2 font-semibold">Asesores</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={row.tienda} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2 pr-2">
                  {i < 3 ? (
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white
                      ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                      {i + 1}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-mono">{i + 1}</span>
                  )}
                </td>
                <td className="py-2 pr-2 font-medium text-gray-700 whitespace-nowrap">{row.tienda}</td>
                <td className="py-2 pr-2 text-right font-semibold text-gray-700 whitespace-nowrap">{formatCOP(row.venta)}</td>
                <td className="py-2 pr-2 text-right">
                  <span className={`font-bold ${getCumplColor(row.cumplimiento)}`}>{row.cumplimiento.toFixed(1)}%</span>
                </td>
                <td className="py-2 pr-2 text-right text-gray-500">{row.margen_pct.toFixed(1)}%</td>
                <td className="py-2 pr-2 text-right text-gray-500">{row.facturas.toLocaleString('es-CO')}</td>
                <td className="py-2 pr-2 text-right text-gray-500 whitespace-nowrap">{formatCOP(row.ticket_promedio)}</td>
                <td className="py-2 text-right text-gray-500">{row.asesores}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > limit && (
        <button onClick={() => setLimit(l => l + 5)}
          className="mt-3 text-xs text-accent hover:text-blue-700 font-medium flex items-center gap-1 mx-auto">
          Ver todas las tiendas →
        </button>
      )}
    </div>
  )
}

// ─── Top advisors table ───────────────────────────────────────────────────────

function TopAsesores({ data, title = 'Top Asesores por Venta', accentColor = '#2563EB' }: {
  data: TopAsesor[]
  title?: string
  accentColor?: string
}) {
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(8)
  const filtered = data.filter(r => r.nombre.toLowerCase().includes(search.toLowerCase()))
  const visible = filtered.slice(0, limit)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar asesor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-gray-600 placeholder-gray-400 outline-none w-28"
            />
          </div>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 outline-none cursor-pointer"
          >
            {[5,8,12].map(n => <option key={n} value={n}>Top {n}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-auto max-h-72 scrollbar-thin flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 pr-2 font-semibold w-6">#</th>
              <th className="text-left py-2 pr-2 font-semibold">Asesor</th>
              <th className="text-left py-2 pr-2 font-semibold">Tienda</th>
              <th className="text-right py-2 pr-2 font-semibold">Venta</th>
              <th className="text-right py-2 pr-2 font-semibold">Cumpl. %</th>
              <th className="text-right py-2 pr-2 font-semibold">Margen %</th>
              <th className="text-right py-2 pr-2 font-semibold">Facturas</th>
              <th className="text-right py-2 font-semibold">Ticket $</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={row.cod_vend} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2 pr-2">
                  {i < 3 ? (
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white
                      ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                      {i + 1}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-mono">{i + 1}</span>
                  )}
                </td>
                <td className="py-2 pr-2 font-medium text-gray-700 whitespace-nowrap">{row.nombre}</td>
                <td className="py-2 pr-2 text-gray-500 whitespace-nowrap">{row.tienda}</td>
                <td className="py-2 pr-2 text-right font-semibold text-gray-700 whitespace-nowrap">{formatCOP(row.venta)}</td>
                <td className="py-2 pr-2 text-right">
                  <span className={`font-bold ${getCumplColor(row.cumplimiento)}`}>{row.cumplimiento.toFixed(1)}%</span>
                </td>
                <td className="py-2 pr-2 text-right text-gray-500">{row.margen_pct.toFixed(1)}%</td>
                <td className="py-2 pr-2 text-right text-gray-500">{(row as any).facturas?.toLocaleString('es-CO') ?? '—'}</td>
                <td className="py-2 text-right text-gray-500 whitespace-nowrap">{formatCOP(row.ticket_promedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > limit && (
        <button onClick={() => setLimit(l => l + 5)}
          className="mt-3 text-xs text-accent hover:text-blue-700 font-medium flex items-center gap-1 mx-auto">
          Ver todos los asesores →
        </button>
      )}
    </div>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'venta' || p.dataKey === 'meta' ? formatCOP(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Rango = 'hoy' | '7d' | '15d' | '30d'

const RANGOS: { label: string; val: Rango }[] = [
  { label: 'Hoy',    val: 'hoy' },
  { label: '7 días', val: '7d' },
  { label: '15 días',val: '15d' },
  { label: '30 días',val: '30d' },
]

function getRangoDates(rango: Rango): { fecha_inicio: string; fecha_fin: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const fin = fmt(today)
  const dias = rango === 'hoy' ? 0 : rango === '7d' ? 6 : rango === '15d' ? 14 : 29
  const inicio = new Date(today)
  inicio.setDate(today.getDate() - dias)
  return { fecha_inicio: fmt(inicio), fecha_fin: fin }
}

export default function CompanyDashboard() {
  const { user } = useAuthStore()
  const [periodo, setPeriodo] = useState(getCurrentPeriodo())
  const [rango, setRango] = useState<Rango>('30d')
  const [data, setData] = useState<CompanyDashboardData | null>(null)
  const [prevData, setPrevData] = useState<CompanyDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const MESES_LONG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const [y, m] = periodo.split('-').map(Number)
  const periodoLabel = `${MESES_LONG[m - 1]} ${y}`

  useEffect(() => {
    setLoading(true)
    setError('')
    const { fecha_inicio, fecha_fin } = getRangoDates(rango)
    const prev = getPrevPeriodo(periodo)
    Promise.all([
      getCompanyDashboard({ fecha_inicio, fecha_fin }),
      getCompanyDashboard({ periodo: prev }).catch(() => null),
    ])
      .then(([cur, prv]) => {
        setData(cur.data)
        setPrevData(prv?.data ?? null)
      })
      .catch(err => {
        if (err?.response?.status !== 401) setError('Error al cargar el dashboard.')
      })
      .finally(() => setLoading(false))
  }, [rango, periodo])

  if (loading) return <LoadingSpinner fullScreen />

  // Trend calculation
  function trend(cur: number, prev?: number | null): number | null {
    if (!prev || prev === 0) return null
    return ((cur - prev) / Math.abs(prev)) * 100
  }

  const kpis = data?.kpis
  const pk = prevData?.kpis

  // Ventas diarias (use daily data if available, else build from existing)
  const dailyData = (data as any)?.ventas_diarias?.map((d: any) => ({
    fecha: d.fecha ? d.fecha.slice(5) : '', // MM-DD
    venta: d.venta,
    meta: d.meta ?? 0,
  })) ?? []

  // Canal pie data
  const canalPie = (data?.canales ?? []).map((c, i) => ({
    name: c.canal,
    value: c.venta,
    pct: ((c.venta / (kpis?.venta_total || 1)) * 100).toFixed(1),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  // Brand pie data
  const brandPie = (data?.marcas ?? []).slice(0, 8).map((b, i) => ({
    name: b.marca,
    value: b.venta,
    pct: b.participacion.toFixed(0),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  // Canal spark: real daily data from backend
  const ventas_diarias_canal: Record<string, { fecha: string; venta: number }[]> =
    (data as any)?.ventas_diarias_canal ?? {}

  function canalSpark(canal: string): SparkPoint[] {
    const dias = ventas_diarias_canal[canal] ?? []
    return dias.map(d => ({
      v: d.venta,
      label: d.fecha.slice(8), // DD del YYYY-MM-DD
    }))
  }

  // Growth vs previous
  const growth = pk && kpis ? trend(kpis.venta_total, pk.venta_total) : null

  // Top asesores tiendas (todos los canales de tienda, sin Venta Empresa)
  const topAsesores: TopAsesor[] = data.top_tiendas ?? []
  const topEmpresa: TopAsesor[] = data.top_empresa ?? []

  return (
    <Layout title="INVESAKK" subtitle="Vista Empresa" periodo={periodo} onPeriodoChange={setPeriodo}>
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {data && (
        <div className="space-y-5">

          {/* ── Greeting ── */}
          <div className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3"
            style={{ background: 'linear-gradient(135deg, #1a2e4a 0%, #1e3a5f 50%, #2563eb 100%)' }}>
            <div>
              <p className="text-blue-300 text-xs font-medium uppercase tracking-widest mb-1">Vista general</p>
              <h1 className="text-2xl font-bold text-white">¡Hola, {user?.nombre?.split(' ')[0]}!</h1>
              <p className="text-blue-300 text-sm mt-1">
                {rango === 'hoy' ? 'Datos de hoy' : `Últimos ${rango === '7d' ? '7' : rango === '15d' ? '15' : '30'} días`}
                {' · '}{periodoLabel}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1">
              {RANGOS.map(({ label, val }) => (
                <button key={val} onClick={() => setRango(val)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                    ${rango === val ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <NewKPICard
              iconKey="venta" title="Venta Total"
              value={fmtM(kpis?.venta_total ?? 0)}
              trend={trend(kpis?.venta_total ?? 0, pk?.venta_total)}
              subtitle="vs. mes anterior"
            />
            <NewKPICard
              iconKey="meta" title="Meta Total"
              value={fmtM(kpis?.meta_total ?? 0)}
              subtitle={`Cumplimiento ${(kpis?.cumplimiento ?? 0).toFixed(1)}%`}
            />
            <NewKPICard
              iconKey="margen" title="Margen Promedio"
              value={`${(kpis?.margen_pct ?? 0).toFixed(1)}%`}
              trend={trend(kpis?.margen_pct ?? 0, pk?.margen_pct)}
              subtitle="vs. mes anterior"
            />
            <NewKPICard
              iconKey="fact" title="Facturas"
              value={(kpis?.facturas ?? 0).toLocaleString('es-CO')}
              trend={trend(kpis?.facturas ?? 0, pk?.facturas)}
              subtitle="vs. mes anterior"
            />
            <NewKPICard
              iconKey="clientes" title="Clientes"
              value={(kpis?.clientes ?? 0).toLocaleString('es-CO')}
              trend={trend(kpis?.clientes ?? 0, pk?.clientes)}
              subtitle="vs. mes anterior"
            />
            <NewKPICard
              iconKey="ticket" title="Ticket Promedio"
              value={`$ ${((kpis?.ticket_promedio ?? 0) / 1000).toFixed(1)}K`}
              trend={trend(kpis?.ticket_promedio ?? 0, pk?.ticket_promedio)}
              subtitle="vs. mes anterior"
            />
            <NewKPICard
              iconKey="ticketitem" title="Ítems / Ticket"
              value={(kpis?.items_factura ?? 0).toFixed(2)}
              subtitle="Promedio de ítems"
            />
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Line chart - Evolución */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Evolución de Ventas</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded"/>Ventas</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-300 inline-block rounded border-dashed"/>Meta</span>
                  <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white text-gray-600 outline-none ml-1">
                    <option>Últimos 30 días</option>
                  </select>
                </div>
              </div>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="gVenta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : `${(v/1e3).toFixed(0)}K`} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="venta" name="Ventas" stroke="#2563EB" strokeWidth={2} fill="url(#gVenta)" dot={false} />
                    {dailyData.some((d: any) => d.meta > 0) && (
                      <Line type="monotone" dataKey="meta" name="Meta" stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-400">Sin datos de evolución diaria</div>
              )}
            </div>

            {/* Canal donut */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-1">Ventas por Canal</h3>
              <p className="text-2xl font-bold text-gray-800">{fmtM(kpis?.venta_total ?? 0)}</p>
              <p className="text-xs text-gray-400 mb-2">Total ventas</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={canalPie} cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                    dataKey="value" labelLine={false} label={PieLabel}>
                    {canalPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCOP(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {canalPie.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600 truncate max-w-[80px]">{c.name}</span>
                    </div>
                    <span className="text-gray-500 font-medium">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand donut */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-gray-800">Participación por Marca</h3>
                <span className="text-xs text-gray-400">Por ventas</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{fmtM(kpis?.venta_total ?? 0)}</p>
              <p className="text-xs text-gray-400 mb-2">Total ventas</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={brandPie} cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                    dataKey="value" labelLine={false} label={PieLabel}>
                    {brandPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCOP(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {brandPie.slice(0, 6).map((b, i) => (
                  <div key={b.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600 truncate max-w-[80px]">{b.name}</span>
                    </div>
                    <span className="text-gray-500 font-medium">{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Canal mini-cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(data.canales ?? []).slice(0, 3).map(c => (
              <CanalCard
                key={c.canal}
                canal={c.canal}
                venta={c.venta}
                cumplimiento={c.cumplimiento}
                margen_pct={c.margen_pct}
                spark={canalSpark(c.canal)}
              />
            ))}
          </div>

          {/* ── Tables row: Tiendas + Top Asesores (sin Venta Empresa) ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <RankingTiendas data={data.tiendas.filter(t => t.tienda?.toUpperCase() !== 'VENTA EMPRESA')} />
            <TopAsesores
              title="Top Asesores — Tiendas"
              data={topAsesores}
            />
          </div>

          {/* ── Top Venta Empresa ── */}
          {topEmpresa.length > 0 && (
            <TopAsesores
              title="Top Asesores — Venta Empresa"
              data={topEmpresa}
              accentColor="#10B981"
            />
          )}

          {/* ── Distribución horaria ── */}
          <HourlyChart data={(data as any).distribucion_horaria ?? []} />

        </div>
      )}

    </Layout>
  )
}
