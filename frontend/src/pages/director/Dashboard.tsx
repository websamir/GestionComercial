import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import Layout from '../../components/Layout'
import LoadingSpinner from '../../components/LoadingSpinner'
import HourlyChart from '../../components/HourlyChart'
import { getStoreDashboard } from '../../api/store'
import { useAuthStore } from '../../store/auth'
import type { DirectorDashboardData } from '../../types'
import { formatCOP } from '../../components/KPICard'

// ─── helpers ─────────────────────────────────────────────────────────────────

function getCurrentPeriodo() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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

type Rango = 'hoy' | '7d' | '15d' | '30d'
const RANGOS: { label: string; val: Rango }[] = [
  { label: 'Hoy',     val: 'hoy' },
  { label: '7 días',  val: '7d' },
  { label: '15 días', val: '15d' },
  { label: '30 días', val: '30d' },
]

function getRangoDates(rango: Rango) {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const fin = fmt(today)
  const dias = rango === 'hoy' ? 0 : rango === '7d' ? 6 : rango === '15d' ? 14 : 29
  const inicio = new Date(today)
  inicio.setDate(today.getDate() - dias)
  return { fecha_inicio: fmt(inicio), fecha_fin: fin }
}

// ─── KPI card ────────────────────────────────────────────────────────────────

const KPI_ICONS: Record<string, { d: string; accent: string; iconColor: string }> = {
  venta:    { d: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',         accent: '#2563EB', iconColor: '#2563EB' },
  meta:     { d: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', accent: '#8B5CF6', iconColor: '#8B5CF6' },
  margen:   { d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',                                accent: '#F97316', iconColor: '#F97316' },
  fact:     { d: 'M9 12h6M9 16h6M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7', accent: '#EC4899', iconColor: '#EC4899' },
  clientes: { d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8',         accent: '#14B8A6', iconColor: '#14B8A6' },
  ticket:      { d: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', accent: '#EAB308', iconColor: '#CA8A04' },
  ticketitem:  { d: 'M7 7h10M7 12h6M7 17h4M3 3h18v18H3z',                          accent: '#D97706', iconColor: '#B45309' },
  items:       { d: 'M4 6h16M4 10h16M4 14h16M4 18h16',                              accent: '#6366F1', iconColor: '#6366F1' },
  unidades:    { d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10',        accent: '#06B6D4', iconColor: '#06B6D4' },
}

function NewKPICard({ title, value, subtitle, iconKey }: {
  title: string; value: string; subtitle?: string; iconKey: keyof typeof KPI_ICONS
}) {
  const ico = KPI_ICONS[iconKey]
  return (
    <div className="rounded-xl shadow-sm p-4 flex flex-col gap-3"
      style={{ borderBottom: `3px solid ${ico.accent}`, background: `${ico.accent}12` }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ico.iconColor} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
        <path d={ico.d} />
      </svg>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{value}</p>
        <p className="text-xs mt-1.5 font-medium uppercase tracking-wide" style={{ color: ico.iconColor, opacity: 0.8 }}>{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── Asesores table ───────────────────────────────────────────────────────────

function AsesoresTable({ data }: { data: any[] }) {
  const [search, setSearch] = useState('')
  const filtered = data.filter(r =>
    r.nombre?.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Asesores de Tienda</h3>
        </div>
        <input
          type="text"
          placeholder="Buscar asesor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-accent w-36"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide">
              <th className="text-left py-2 pr-2 font-semibold w-6">#</th>
              <th className="text-left py-2 pr-2 font-semibold">Asesor</th>
              <th className="text-right py-2 pr-2 font-semibold">Venta</th>
              <th className="text-right py-2 pr-2 font-semibold">Cumpl.%</th>
              <th className="text-right py-2 pr-2 font-semibold">Ticket $</th>
              <th className="text-right py-2 pr-2 font-semibold">Margen%</th>
              <th className="text-right py-2 font-semibold">Fact/día</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
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
                <td className="py-2 pr-2">
                  <p className="font-medium text-gray-700 whitespace-nowrap">{row.nombre}</p>
                  <p className="text-gray-400 text-xs">#{row.cod_vend}</p>
                </td>
                <td className="py-2 pr-2 text-right font-semibold text-gray-700 whitespace-nowrap">{formatCOP(row.venta)}</td>
                <td className="py-2 pr-2 text-right">
                  <span className={`font-bold ${getCumplColor(row.cumplimiento)}`}>{row.cumplimiento.toFixed(1)}%</span>
                </td>
                <td className="py-2 pr-2 text-right text-gray-500 whitespace-nowrap">{formatCOP(row.ticket_promedio)}</td>
                <td className="py-2 pr-2 text-right text-gray-500">{row.margen_pct.toFixed(1)}%</td>
                <td className="py-2 text-right text-gray-500">{row.facturas_dia?.toFixed(1) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          {p.name}: {formatCOP(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DirectorDashboard() {
  const { user } = useAuthStore()
  const [periodo] = useState(getCurrentPeriodo())
  const [rango, setRango] = useState<Rango>('30d')
  const [data, setData] = useState<DirectorDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const MESES_LONG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const [y, m] = periodo.split('-').map(Number)
  const periodoLabel = `${MESES_LONG[m - 1]} ${y}`

  useEffect(() => {
    setLoading(true)
    setError('')
    const { fecha_inicio, fecha_fin } = getRangoDates(rango)
    getStoreDashboard({ fecha_inicio, fecha_fin })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) setError('Error al cargar el dashboard.')
      })
      .finally(() => setLoading(false))
  }, [rango])

  if (loading) return <LoadingSpinner fullScreen />

  const kpis = data?.kpis

  const dailyData = (data as any)?.ventas_diarias?.map((d: any) => ({
    fecha: d.fecha ? d.fecha.slice(5) : '',
    venta: d.venta,
  })) ?? []

  const cumplPct = kpis?.cumplimiento ?? 0
  const cumplWidth = Math.min(cumplPct, 100)

  return (
    <Layout title={data?.tienda ?? 'Mi Tienda'} subtitle={data?.director ?? user?.nombre} periodo={periodo}>
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {data && (
        <div className="space-y-5">

          {/* ── Greeting ── */}
          <div className="rounded-2xl px-6 py-5 flex flex-wrap items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg, #1a2e4a 0%, #1e3a5f 50%, #2563eb 100%)' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Vista general</p>
              <h1 className="text-2xl font-bold text-white leading-tight">¡Hola, {user?.nombre?.split(' ')[0]}!</h1>
              <p className="text-sm text-white/60 mt-0.5">
                {data.tienda} · {rango === 'hoy' ? 'Datos de hoy' : `Últimos ${rango === '7d' ? '7' : rango === '15d' ? '15' : '30'} días`}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl p-1 bg-white/10 backdrop-blur-sm border border-white/20">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <NewKPICard iconKey="venta"    title="Venta Tienda"   value={fmtM(kpis?.venta ?? 0)} />
            <NewKPICard iconKey="meta"     title="Meta"           value={fmtM(kpis?.meta ?? 0)}
              subtitle={`Cumpl. ${cumplPct.toFixed(1)}%`} />
            <NewKPICard iconKey="margen"   title="Margen %"       value={`${(kpis?.margen_pct ?? 0).toFixed(1)}%`}
              subtitle={formatCOP(kpis?.margen_cop ?? 0)} />
            <NewKPICard iconKey="fact"     title="Facturas"       value={String(kpis?.facturas ?? 0)}
              subtitle={`${(kpis?.facturas_dia ?? 0).toFixed(1)} fact/día`} />
            <NewKPICard iconKey="clientes" title="Clientes"       value={String(kpis?.clientes ?? 0)} />
            <NewKPICard iconKey="ticket"      title="Ticket $"      value={fmtM(kpis?.ticket_promedio ?? 0)}
              subtitle="Valor / factura" />
            <NewKPICard iconKey="ticketitem" title="Ítems / Ticket"
              value={(kpis?.items_factura ?? 0).toFixed(2)}
              subtitle="Promedio de ítems" />
            <NewKPICard iconKey="unidades" title="Unidades"       value={String(kpis?.unidades ?? 0)} />
          </div>

          {/* ── Cumplimiento bar ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">
                Meta: <span className="font-semibold text-gray-700">{formatCOP(kpis?.meta ?? 0)}</span>
                <span className="mx-2">·</span>
                Alcanzado: <span className="font-semibold text-gray-700">{formatCOP(kpis?.venta ?? 0)}</span>
              </div>
              <span className={`text-sm font-bold ${getCumplColor(cumplPct)}`}>{cumplPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cumplPct >= 80 ? 'bg-green-500' : cumplPct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${cumplWidth}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Faltan: {formatCOP(kpis?.faltan ?? 0)}</p>
          </div>

          {/* ── Evolución diaria ── */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Evolución de Ventas — {data.tienda}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="dirGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="venta" name="Venta" stroke="#2563EB" strokeWidth={2}
                  fill="url(#dirGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Asesores table ── */}
          <AsesoresTable data={data.asesores ?? []} />

          {/* ── Distribución horaria ── */}
          <HourlyChart data={(data as any).distribucion_horaria ?? []} />

          {/* ── Marcas ── */}
          {(data.marcas ?? []).length > 0 && (() => {
            const marcas = (data.marcas ?? []) as any[]
            const PIE_COLORS = ['#1e40af','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe']
            const RADIAN = Math.PI / 180
            const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
              if (percent < 0.05) return null
              const r = innerRadius + (outerRadius - innerRadius) * 0.5
              const x = cx + r * Math.cos(-midAngle * RADIAN)
              const y = cy + r * Math.sin(-midAngle * RADIAN)
              return (
                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="600">
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              )
            }
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Barras: ventas */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Ventas por Marca</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={marcas.map((b: any) => ({ name: b.marca?.slice(0, 14), venta: b.venta }))}
                      margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
                      layout="vertical"
                    >
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={95} />
                      <Tooltip formatter={(v: any) => formatCOP(v)} />
                      <Bar dataKey="venta" radius={[0, 4, 4, 0]} opacity={0.85}>
                        {marcas.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Torta: margen por marca */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Margen % por Marca</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={marcas.map((b: any) => ({ name: b.marca, value: Math.max(b.margen_pct ?? 0, 0) }))}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={85}
                        dataKey="value"
                        labelLine={false}
                        label={PieLabel}
                      >
                        {marcas.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {marcas.slice(0, 6).map((b: any, i: number) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-gray-500 truncate max-w-[80px]">{b.marca}</span>
                        <span className="text-xs font-semibold text-gray-700">{(b.margen_pct ?? 0).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

        </div>
      )}
    </Layout>
  )
}
