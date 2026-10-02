import type { ProductRow } from '../types'
import { formatCOP } from './KPICard'

interface Props {
  data: ProductRow[]
  title?: string
}

function getMarginColor(pct: number) {
  if (pct >= 30) return 'text-success'
  if (pct >= 15) return 'text-warning'
  return 'text-danger'
}

export default function ProductsTable({ data, title = 'Top 10 Productos' }: Props) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase text-text-secondary">#</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase text-text-secondary">Producto</th>
              <th className="text-right py-2 pr-4 text-xs font-semibold uppercase text-text-secondary">Venta</th>
              <th className="text-right py-2 pr-4 text-xs font-semibold uppercase text-text-secondary">Margen%</th>
              <th className="text-right py-2 text-xs font-semibold uppercase text-text-secondary">Unidades</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2 pr-4 text-text-secondary font-mono text-xs">{i + 1}</td>
                <td className="py-2 pr-4 text-text-primary font-medium max-w-[260px] truncate">
                  {row.descripcion}
                </td>
                <td className="py-2 pr-4 text-right font-semibold text-text-primary">
                  {formatCOP(row.venta)}
                </td>
                <td className={`py-2 pr-4 text-right font-semibold ${getMarginColor(row.margen_pct)}`}>
                  {row.margen_pct.toFixed(1)}%
                </td>
                <td className="py-2 text-right text-text-secondary">
                  {row.unidades.toLocaleString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
