import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import KPICard from '../../components/KPICard'
import ComplianceBar from '../../components/ComplianceBar'
import SalesChart from '../../components/SalesChart'
import { BrandsBarChart, BodegaPieChart } from '../../components/BrandsChart'
import ProductsTable from '../../components/ProductsTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getMeDashboard } from '../../api/me'
import { useAuthStore } from '../../store/auth'
import type { AsesorDashboardData } from '../../types'
import { formatCOP } from '../../components/KPICard'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function getCurrentPeriodo() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCumplColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 80) return 'green'
  if (pct >= 60) return 'amber'
  return 'red'
}

export default function AsesorDashboard() {
  const { user } = useAuthStore()
  const [periodo, setPeriodo] = useState(getCurrentPeriodo())
  const [data, setData] = useState<AsesorDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getMeDashboard({ periodo })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          setError('Error al cargar el dashboard. Intente nuevamente.')
        }
      })
      .finally(() => setLoading(false))
  }, [periodo])

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <Layout
      title={data?.asesor.nombre ?? user?.nombre ?? 'Mi Dashboard'}
      subtitle={data ? `Cód. ${data.asesor.cod_vend} · ${data.asesor.tienda} · ${data.asesor.canal}` : ''}
      periodo={periodo}
      onPeriodoChange={setPeriodo}
    >
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KPICard
              title="Venta"
              value={data.kpis.venta}
              format="currency"
              color="blue"
              trend={data.kpis.venta >= data.kpis.meta ? 'up' : 'down'}
              trendValue={`vs Meta ${((data.kpis.venta / data.kpis.meta) * 100).toFixed(0)}%`}
            />
            <KPICard
              title="Meta"
              value={data.kpis.meta}
              format="currency"
              color="default"
            />
            <KPICard
              title="Cumplimiento"
              value={data.kpis.cumplimiento}
              format="percent"
              color={getCumplColor(data.kpis.cumplimiento)}
            />
            <KPICard
              title="Margen %"
              value={data.kpis.margen_pct}
              format="percent"
              color="default"
              subtitle={formatCOP(data.kpis.margen_cop)}
            />
            <KPICard
              title="Facturas"
              value={data.kpis.facturas}
              format="number"
              color="default"
              subtitle={`${data.kpis.facturas_dia.toFixed(1)} fact/día`}
            />
            <KPICard
              title="Clientes"
              value={data.kpis.clientes}
              format="number"
              color="default"
            />
          </div>

          {/* Compliance Bar */}
          <ComplianceBar
            meta={data.kpis.meta}
            alcanzado={data.kpis.venta}
            cumplimiento={data.kpis.cumplimiento}
          />

          {/* Line Chart */}
          <SalesChart data={data.ventas_diarias} />

          {/* Brands & Bodegas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BrandsBarChart data={data.marcas} />
            <BodegaPieChart data={data.bodegas} />
          </div>

          {/* Productivity row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              title="Ticket Promedio"
              value={data.kpis.ticket_promedio}
              format="currency"
              color="blue"
            />
            <KPICard
              title="Ítems / Factura"
              value={data.kpis.items_factura}
              format="number"
              color="default"
            />
            <KPICard
              title="Clientes Únicos"
              value={data.kpis.clientes}
              format="number"
              color="default"
            />
            <KPICard
              title="Unidades"
              value={data.kpis.unidades}
              format="number"
              color="default"
            />
          </div>

          {/* Products Table */}
          <ProductsTable data={data.top_productos} />

          {/* Hourly distribution */}
          {data.distribucion_horaria && data.distribucion_horaria.length > 0 && (
            <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Distribución Horaria</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.distribucion_horaria} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="hora"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(h) => `${h}h`}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val: number, name: string) => [val, name === 'facturas' ? 'Facturas' : 'Venta']}
                  />
                  <Bar dataKey="facturas" name="Facturas" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
