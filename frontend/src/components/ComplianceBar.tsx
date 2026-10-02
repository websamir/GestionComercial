import { formatCOP } from './KPICard'

interface Props {
  meta: number
  alcanzado: number
  cumplimiento: number
}

function getColor(pct: number) {
  if (pct >= 80) return { bar: 'bg-success', text: 'text-success' }
  if (pct >= 60) return { bar: 'bg-warning', text: 'text-warning' }
  return { bar: 'bg-danger', text: 'text-danger' }
}

export default function ComplianceBar({ meta, alcanzado, cumplimiento }: Props) {
  const { bar, text } = getColor(cumplimiento)
  const faltan = Math.max(0, meta - alcanzado)
  const width = Math.min(100, cumplimiento)

  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-sm">
        <span className="text-text-secondary">
          Meta: <strong className="text-text-primary">{formatCOP(meta)}</strong>
        </span>
        <span className="text-text-secondary">
          Alcanzado: <strong className="text-text-primary">{formatCOP(alcanzado)}</strong>
        </span>
        <span className={`font-bold text-base ${text}`}>{cumplimiento.toFixed(1)}%</span>
        <span className="text-text-secondary">
          Faltan: <strong className="text-danger">{formatCOP(faltan)}</strong>
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`${bar} h-3 rounded-full transition-all duration-700`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
