import { useNavigate } from 'react-router-dom'
import type { AdvisorRow } from '../types'
import { formatCOP } from './KPICard'

interface Props {
  data: AdvisorRow[]
  clickable?: boolean
}

function getCumplColor(pct: number) {
  if (pct >= 80) return 'text-success bg-green-50'
  if (pct >= 60) return 'text-warning bg-amber-50'
  return 'text-danger bg-red-50'
}

export default function AdvisorsTable({ data, clickable = false }: Props) {
  const navigate = useNavigate()

  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Asesores</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Asesor</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Venta</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Meta</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Cumpl%</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Margen%</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Fact/Día</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Ticket $</th>
              <th className="text-right py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Ticket Ítem</th>
              <th className="text-right py-2 text-xs font-semibold uppercase text-text-secondary">Clientes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.cod_vend}
                className={`border-b border-gray-50 hover:bg-blue-50 transition-colors ${clickable ? 'cursor-pointer' : ''}`}
                onClick={() => clickable && navigate(`/director/asesor/${row.cod_vend}`)}
              >
                <td className="py-2 pr-3">
                  <div className="font-medium text-text-primary">{row.nombre}</div>
                  <div className="text-xs text-text-secondary">#{row.cod_vend}</div>
                </td>
                <td className="py-2 pr-3 text-right font-semibold text-text-primary whitespace-nowrap">
                  {formatCOP(row.venta)}
                </td>
                <td className="py-2 pr-3 text-right text-text-secondary whitespace-nowrap">
                  {formatCOP(row.meta)}
                </td>
                <td className="py-2 pr-3 text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${getCumplColor(row.cumplimiento)}`}>
                    {row.cumplimiento.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 pr-3 text-right font-medium text-text-primary">
                  {row.margen_pct.toFixed(1)}%
                </td>
                <td className="py-2 pr-3 text-right text-text-secondary">
                  {row.facturas_dia.toFixed(1)}
                </td>
                <td className="py-2 pr-3 text-right text-text-secondary whitespace-nowrap">
                  {formatCOP(row.ticket_promedio)}
                </td>
                <td className="py-2 pr-3 text-right text-text-secondary">
                  {(row.items_factura ?? 0).toFixed(1)}
                </td>
                <td className="py-2 text-right text-text-secondary">
                  {row.clientes.toLocaleString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
