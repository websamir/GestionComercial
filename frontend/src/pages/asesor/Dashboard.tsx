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
import HourlyChart from '../../components/HourlyChart'

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
              title="Ticket $"
              value={data.kpis.ticket_promedio}
              format="currency"
              color="blue"
              subtitle="Valor promedio por factura"
            />
            <KPICard
              title="Ticket Ítems"
              value={data.kpis.items_factura}
              format="number"
              color="default"
              subtitle="Ítems promedio por factura"
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
          <HourlyChart data={data.distribucion_horaria ?? []} />
        </div>
      )}
    </Layout>
  )
}
