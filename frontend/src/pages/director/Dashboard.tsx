import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import KPICard from '../../components/KPICard'
import ComplianceBar from '../../components/ComplianceBar'
import SalesChart from '../../components/SalesChart'
import { BrandsBarChart } from '../../components/BrandsChart'
import AdvisorsTable from '../../components/AdvisorsTable'
import ProductsTable from '../../components/ProductsTable'
import HourlyChart from '../../components/HourlyChart'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getStoreDashboard } from '../../api/store'
import { useAuthStore } from '../../store/auth'
import type { DirectorDashboardData } from '../../types'
import { formatCOP } from '../../components/KPICard'

function getCurrentPeriodo() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCumplColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 80) return 'green'
  if (pct >= 60) return 'amber'
  return 'red'
}

export default function DirectorDashboard() {
  const { user } = useAuthStore()
  const [periodo, setPeriodo] = useState(getCurrentPeriodo())
  const [data, setData] = useState<DirectorDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getStoreDashboard({ periodo })
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
      title={data?.tienda ?? 'Mi Tienda'}
      subtitle={data?.director ?? user?.nombre}
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
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <KPICard title="Venta Tienda" value={data.kpis.venta} format="currency" color="blue" />
            <KPICard title="Meta" value={data.kpis.meta} format="currency" color="default" />
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
              subtitle={formatCOP(data.kpis.margen_cop)}
            />
            <KPICard
              title="Facturas"
              value={data.kpis.facturas}
              format="number"
              subtitle={`${data.kpis.facturas_dia.toFixed(1)} fact/día`}
            />
            <KPICard title="Clientes" value={data.kpis.clientes} format="number" />
            <KPICard title="Ticket $" value={data.kpis.ticket_promedio} format="currency" subtitle="Valor / factura" />
            <KPICard title="Ticket Ítems" value={data.kpis.items_factura} format="number" subtitle="Ítems / factura" />
          </div>

          {/* Compliance Bar */}
          <ComplianceBar
            meta={data.kpis.meta}
            alcanzado={data.kpis.venta}
            cumplimiento={data.kpis.cumplimiento}
          />

          {/* Line Chart */}
          <SalesChart data={data.ventas_diarias} title="Evolución Tienda" />

          {/* Advisors Table */}
          <AdvisorsTable data={data.asesores} clickable />

          {/* Hourly distribution */}
          <HourlyChart data={data.distribucion_horaria ?? []} />

          {/* Brands & Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BrandsBarChart data={data.marcas} />
            <ProductsTable data={data.top_productos} />
          </div>
        </div>
      )}
    </Layout>
  )
}
