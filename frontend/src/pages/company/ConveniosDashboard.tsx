import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import Layout from '../../components/Layout'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getConveniosDashboard } from '../../api/company'

const fmtM = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

const CONV_COLORS: Record<string, string> = {
  ADDI: '#6366f1',
  PLATAM: '#0ea5e9',
  BRILLA: '#f59e0b',
}
const BRAND_COLORS = ['#1e3a5f', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((e: any) => (
        <p key={e.dataKey} style={{ color: e.color }}>{e.name}: {fmtM(e.value)}</p>
      ))}
    </div>
  )
}

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const R = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * R)
  const y = cy + r * Math.sin(-midAngle * R)
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{`${(percent * 100).toFixed(0)}%`}</text>
}

export default function ConveniosDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    const params: any = {}
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin) params.fecha_fin = fechaFin
    getConveniosDashboard(params)
      .then(r => setData(r.data))
      .catch(() => setError('Error cargando datos de convenios'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <LoadingSpinner fullScreen />
  if (error) return (
    <Layout title="Convenios" subtitle="Análisis de convenios financieros">
      <div className="text-center py-16 text-red-500">{error}</div>
    </Layout>
  )

  const kpis = data?.kpis ?? {}
  const porConvenio: any[] = data?.por_convenio ?? []
  const topTiendas: any[] = data?.top_tiendas ?? []
  const topAsesores: any[] = data?.top_asesores ?? []
  const evolucion: any[] = data?.evolucion_diaria ?? []
  const marcas: any[] = data?.marcas ?? []
  const ve = data?.venta_empresa ?? {}

  const maxTienda = topTiendas[0]?.venta ?? 1
  const maxAsesor = topAsesores[0]?.venta ?? 1

  return (
    <Layout title="Convenios" subtitle="Análisis de convenios financieros INVESAKK">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Desde</label>
          <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Hasta</label>
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={load}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Aplicar
        </button>
        {(fechaInicio || fechaFin) && (
          <button onClick={() => { setFechaInicio(''); setFechaFin(''); setTimeout(load, 0) }}
            className="px-3 py-1.5 border border-gray-200 text-sm text-gray-500 rounded-lg hover:bg-gray-50">
            Limpiar
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Convenios', value: fmtM(kpis.total ?? 0), sub: `${(kpis.pct_del_total ?? 0).toFixed(1)}% del total ventas`, color: 'border-l-indigo-500' },
          { label: 'Facturas', value: (kpis.facturas ?? 0).toLocaleString('es-CO'), sub: 'documentos de venta', color: 'border-l-blue-500' },
          { label: 'Margen Convenios', value: `${(kpis.margen_pct ?? 0).toFixed(1)}%`, sub: 'utilidad neta', color: 'border-l-green-500' },
          { label: 'Venta Empresa', value: fmtM(ve.total ?? 0), sub: `${(ve.pct_del_total ?? 0).toFixed(1)}% del total ventas`, color: 'border-l-amber-500' },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 ${k.color} p-4`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-gray-800 leading-tight">{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Por convenio + Venta empresa */}
      <div className="flex flex-wrap gap-4 mb-6">
        {porConvenio.map(c => (
          <div key={c.nombre} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-w-[170px] flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: CONV_COLORS[c.nombre] ?? '#6b7280' }} />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{c.nombre}</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{fmtM(c.total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.pct.toFixed(1)}% de convenios · {c.facturas.toLocaleString('es-CO')} fact.</p>
            <p className="text-xs text-gray-400 mt-0.5">Margen {c.margen_pct.toFixed(1)}%</p>
          </div>
        ))}
        {ve.total > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-w-[170px] flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Venta Empresa</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{fmtM(ve.total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{ve.pct_del_total.toFixed(1)}% del total · {ve.facturas.toLocaleString('es-CO')} fact.</p>
            <p className="text-xs text-gray-400 mt-0.5">Margen {ve.margen_pct.toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* Top tiendas + Top asesores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Top tiendas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Tiendas — Convenios</h3>
          <div className="space-y-2.5">
            {topTiendas.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-xs text-gray-600 w-28 truncate flex-shrink-0">{t.tienda}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.max((t.venta / maxTienda) * 100, 3)}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-20 text-right flex-shrink-0">{fmtAxis(t.venta)}</span>
                <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{t.pct.toFixed(0)}%</span>
              </div>
            ))}
            {topTiendas.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>}
          </div>
        </div>

        {/* Top asesores */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Asesores — Convenios</h3>
          <div className="space-y-2.5">
            {topAsesores.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-xs text-gray-600 w-32 truncate flex-shrink-0">{a.nombre}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.max((a.venta / maxAsesor) * 100, 3)}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-20 text-right flex-shrink-0">{fmtAxis(a.venta)}</span>
                <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{a.pct.toFixed(0)}%</span>
              </div>
            ))}
            {topAsesores.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>}
          </div>
        </div>
      </div>

      {/* Evolución diaria + Marcas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolución diaria */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Evolución Diaria — Convenios</h3>
          {evolucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolucion} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="venta" name="Convenios" stroke="#6366f1" strokeWidth={2} fill="url(#convGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 text-center py-16">Sin datos de evolución</p>
          )}
        </div>

        {/* Proporción de marcas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Marcas en Convenios</h3>
          {marcas.length > 0 ? (
            <div className="flex flex-col gap-1">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={marcas} dataKey="venta" nameKey="marca" cx="50%" cy="50%"
                    outerRadius={70} labelLine={false} label={renderPieLabel}>
                    {marcas.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtM(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {marcas.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] }} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{m.marca}</span>
                    <span className="text-xs font-semibold text-gray-700">{fmtAxis(m.venta)}</span>
                    <span className="text-xs text-gray-400 w-9 text-right">{m.participacion.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-16">Sin datos de marcas</p>
          )}
        </div>
      </div>
    </Layout>
  )
}
