import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import KPICard from '../../components/KPICard'
import { BrandsPieChart } from '../../components/BrandsChart'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getCompanyDashboard } from '../../api/company'
import type { CompanyDashboardData, StoreRow, TopAsesor, ChannelKPIs, ConveniosData, ConvenioBarra, BrandSale } from '../../types'
import { formatCOP } from '../../components/KPICard'

function getCurrentPeriodo() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCumplBadge(pct: number) {
  if (pct >= 80) return 'text-success bg-green-50'
  if (pct >= 60) return 'text-warning bg-amber-50'
  return 'text-danger bg-red-50'
}

function ChannelCard({ canal, barras }: { canal: ChannelKPIs; barras?: ConvenioBarra[] }) {
  const maxVenta = barras && barras.length > 0 ? Math.max(...barras.map((b) => Math.abs(b.venta)), 1) : 1
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <h4 className="text-sm font-bold text-primary uppercase tracking-wide mb-3">{canal.canal}</h4>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-xs text-text-secondary">Venta</p>
          <p className="text-sm font-bold text-text-primary">{formatCOP(canal.venta)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Cumpl.</p>
          <p className={`text-sm font-bold ${canal.cumplimiento >= 80 ? 'text-success' : canal.cumplimiento >= 60 ? 'text-warning' : 'text-danger'}`}>
            {canal.cumplimiento.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Margen</p>
          <p className="text-sm font-bold text-text-primary">{canal.margen_pct.toFixed(1)}%</p>
        </div>
      </div>

      {false && (barras?.length ?? 0) > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-2.5">
          {(barras ?? []).map((b) => {
            const pct = Math.max(0, (Math.abs(b.venta) / maxVenta) * 100)
            const isNeg = b.venta < 0
            return (
              <div key={b.nombre}>
                <div className="flex items-start justify-between mb-0.5">
                  <div className="min-w-0 mr-2">
                    <span className="text-xs font-medium text-text-primary truncate block">{b.nombre}</span>
                    <span className="text-xs text-text-secondary">
                      {b.facturas?.toLocaleString('es-CO')} fact. · {b.clientes?.toLocaleString('es-CO')} emp.
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-semibold block ${isNeg ? 'text-danger' : 'text-text-primary'}`}>
                      {formatCOP(b.venta)}
                    </span>
                    <span className="text-xs text-text-secondary">{b.participacion_pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isNeg ? 'bg-danger' : 'bg-primary'}`}
                    style={{ width: `${pct}%`, opacity: isNeg ? 0.6 : 1 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StoresTable({ data }: { data: StoreRow[] }) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Ranking de Tiendas</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">#</th>
              <th className="text-left py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Tienda</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Venta</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Cumpl%</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Margen%</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Facturas</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Ticket</th>
              <th className="text-right py-2 text-xs font-semibold uppercase text-text-secondary">Asesores</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.tienda} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-3 text-text-secondary text-xs">{i + 1}</td>
                <td className="py-2 pr-3 font-medium text-text-primary">{row.tienda}</td>
                <td className="py-2 pr-3 text-right font-semibold whitespace-nowrap">{formatCOP(row.venta)}</td>
                <td className="py-2 pr-3 text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${getCumplBadge(row.cumplimiento)}`}>
                    {row.cumplimiento.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 pr-3 text-right text-text-secondary">{row.margen_pct.toFixed(1)}%</td>
                <td className="py-2 pr-3 text-right text-text-secondary">{row.facturas.toLocaleString('es-CO')}</td>
                <td className="py-2 pr-3 text-right text-text-secondary whitespace-nowrap">{formatCOP(row.ticket_promedio)}</td>
                <td className="py-2 text-right text-text-secondary">{row.asesores}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConveniosSection({ data }: { data: ConveniosData }) {
  if (!data || data.total === 0 || !data.barras?.length) return null
  const maxVenta = Math.max(...data.barras.map((b) => Math.abs(b.venta)), 1)
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">
            Convenios de Financiación
          </p>
          <p className="text-2xl font-bold text-primary">{formatCOP(data.total)}</p>
          <p className="text-xs text-text-secondary mt-0.5">{data.facturas} facturas</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.barras.map((b: ConvenioBarra) => {
          const pct = Math.max(0, (b.venta / maxVenta) * 100)
          const isNeg = b.venta < 0
          return (
            <div key={b.nombre}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-text-primary">{b.nombre}</span>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>{b.facturas} fact.</span>
                  <span className={`font-semibold ${isNeg ? 'text-danger' : 'text-text-primary'}`}>
                    {formatCOP(b.venta)}
                  </span>
                  <span className="w-10 text-right">{b.participacion_pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isNeg ? 'bg-danger' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type TabKey = 'compra_eficiente' | 'tiendas' | 'empresa' | 'tienda_virtual_edo' | 'ebusiness'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'compra_eficiente',   label: 'Compra Eficiente' },
  { key: 'tiendas',            label: 'Tiendas' },
  { key: 'empresa',            label: 'Venta Empresa' },
  { key: 'tienda_virtual_edo', label: 'Tienda Virtual del Estado' },
  { key: 'ebusiness',          label: 'E-business' },
]

function TopAdvisorsSegmented({
  compra_eficiente,
  tiendas,
  empresa,
  tienda_virtual_edo,
  ebusiness,
  activeTab,
  onTabChange,
}: {
  compra_eficiente: TopAsesor[]
  tiendas: TopAsesor[]
  empresa: TopAsesor[]
  tienda_virtual_edo: TopAsesor[]
  ebusiness: TopAsesor[]
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}) {
  const tab = activeTab ?? 'tiendas'
  const setTab = onTabChange

  const dataMap: Record<TabKey, TopAsesor[]> = {
    compra_eficiente,
    tiendas,
    empresa,
    tienda_virtual_edo,
    ebusiness,
  }
  const data = dataMap[tab]

  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-text-primary">Top Asesores por Canal</h3>
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-0.5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-8 text-center text-xs text-text-secondary">
          Sin datos para este canal en el período seleccionado
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-2 text-xs font-semibold uppercase text-text-secondary">#</th>
                  <th className="text-left py-2 pr-2 text-xs font-semibold uppercase text-text-secondary">Asesor</th>
                  <th className="text-left py-2 pr-2 text-xs font-semibold uppercase text-text-secondary">Tienda</th>
                  <th className="text-right py-2 pr-2 text-xs font-semibold uppercase text-text-secondary">Venta</th>
                  <th className="text-right py-2 pr-2 text-xs font-semibold uppercase text-text-secondary">Cumpl%</th>
                  <th className="text-right py-2 pr-2 text-xs font-semibold uppercase text-text-secondary">Ticket $</th>
                  <th className="text-right py-2 pr-2 text-xs font-semibold uppercase text-text-secondary">Ticket Ítem</th>
                  <th className="text-right py-2 text-xs font-semibold uppercase text-text-secondary">Margen%</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.cod_vend} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-2 text-text-secondary text-xs font-mono">{i + 1}</td>
                    <td className="py-1.5 pr-2">
                      <div className="font-medium text-text-primary text-xs leading-tight">{row.nombre}</div>
                      <div className="text-xs text-text-secondary">#{row.cod_vend}</div>
                    </td>
                    <td className="py-1.5 pr-2 text-text-secondary text-xs">{row.tienda}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold whitespace-nowrap text-xs">{formatCOP(row.venta)}</td>
                    <td className="py-1.5 pr-2 text-right">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-bold ${getCumplBadge(row.cumplimiento)}`}>
                        {row.cumplimiento.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right text-text-secondary text-xs whitespace-nowrap">{formatCOP(row.ticket_promedio)}</td>
                    <td className="py-1.5 pr-2 text-right text-text-secondary text-xs">{(row.items_factura ?? 0).toFixed(1)}</td>
                    <td className="py-1.5 text-right text-text-secondary text-xs">{row.margen_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CompanyDashboard() {
  const [periodo, setPeriodo] = useState(getCurrentPeriodo())
  const [data, setData] = useState<CompanyDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canalTab, setCanalTab] = useState<TabKey>('tiendas')

  useEffect(() => {
    setLoading(true)
    setError('')
    getCompanyDashboard({ periodo })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          setError('Error al cargar el dashboard. Intente nuevamente.')
        }
      })
      .finally(() => setLoading(false))
  }, [periodo])

  if (loading) return <LoadingSpinner fullScreen />

  const canalAdvisors: Record<TabKey, TopAsesor[]> = data ? {
    compra_eficiente: data.top_compra_eficiente ?? [],
    tiendas: data.top_tiendas ?? [],
    empresa: data.top_empresa ?? [],
    tienda_virtual_edo: data.top_tienda_virtual_edo ?? [],
    ebusiness: data.top_ebusiness ?? [],
  } : { compra_eficiente: [], tiendas: [], empresa: [], tienda_virtual_edo: [], ebusiness: [] }

  const canalBrandData: BrandSale[] = (data && canalAdvisors[canalTab].length > 0)
    ? (data.marcas_canales as Record<TabKey, BrandSale[]>)?.[canalTab] ?? []
    : []

  return (
    <Layout
      title="INVESAKK"
      subtitle="Vista Empresa"
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
            <KPICard title="Venta Total" value={data.kpis.venta_total} format="currency" color="blue" />
            <KPICard title="Meta Total" value={data.kpis.meta_total} format="currency" color="default" />
            <KPICard
              title="Cumplimiento"
              value={data.kpis.cumplimiento}
              format="percent"
              color={data.kpis.cumplimiento >= 80 ? 'green' : data.kpis.cumplimiento >= 60 ? 'amber' : 'red'}
            />
            <KPICard title="Margen %" value={data.kpis.margen_pct} format="percent" />
            <KPICard title="Facturas" value={data.kpis.facturas} format="number" />
            <KPICard title="Clientes" value={data.kpis.clientes} format="number" />
            <KPICard title="Ticket $" value={data.kpis.ticket_promedio} format="currency" subtitle="Valor / factura" />
            <KPICard title="Ticket Ítems" value={data.kpis.items_factura} format="number" subtitle="Ítems / factura" />
          </div>

          {/* Channels comparison */}
          {data.canales.length > 0 && (
            <div className={`grid gap-3 grid-cols-1 ${data.canales.length === 2 ? 'md:grid-cols-2' : data.canales.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
              {data.canales.map((canal) => (
                <ChannelCard
                  key={canal.canal}
                  canal={canal}
                  barras={canal.canal === 'Convenios' && data.convenios ? data.convenios.barras : undefined}
                />
              ))}
            </div>
          )}

          {/* Stores Ranking */}
          <StoresTable data={data.tiendas} />

          {/* Top Advisors by canal */}
          <TopAdvisorsSegmented
            compra_eficiente={data.top_compra_eficiente ?? []}
            tiendas={data.top_tiendas ?? []}
            empresa={data.top_empresa ?? []}
            tienda_virtual_edo={data.top_tienda_virtual_edo ?? []}
            ebusiness={data.top_ebusiness ?? []}
            activeTab={canalTab}
            onTabChange={setCanalTab}
          />

          {/* Brands Pie — filtered by selected canal; empty if canal has no advisors */}
          <BrandsPieChart
            data={canalBrandData}
            title={`Participación por Marca — ${TABS.find(t => t.key === canalTab)?.label ?? ''}`}
          />
        </div>
      )}
    </Layout>
  )
}
