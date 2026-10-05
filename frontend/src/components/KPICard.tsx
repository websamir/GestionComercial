type Format = 'currency' | 'percent' | 'number'
type Color = 'green' | 'red' | 'blue' | 'amber' | 'default'

interface Props {
  title: string
  value: number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  format: Format
  color?: Color
}

export const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)

export const formatValue = (value: number, format: Format): string => {
  const v = value ?? 0
  switch (format) {
    case 'currency':
      return formatCOP(v)
    case 'percent':
      return `${v.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    case 'number':
      return v.toLocaleString('es-CO')
  }
}

const colorMap: Record<Color, string> = {
  green: 'text-success',
  red: 'text-danger',
  blue: 'text-accent',
  amber: 'text-warning',
  default: 'text-text-primary',
}

const borderMap: Record<Color, string> = {
  green: 'border-l-success',
  red: 'border-l-danger',
  blue: 'border-l-accent',
  amber: 'border-l-warning',
  default: 'border-l-primary',
}

export default function KPICard({ title, value, subtitle, trend, trendValue, format, color = 'default' }: Props) {
  return (
    <div className={`bg-card rounded-lg shadow-sm border border-gray-100 border-l-4 ${borderMap[color]} p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorMap[color]} leading-tight`}>
        {formatValue(value, format)}
      </p>
      {subtitle && <p className="text-xs text-text-secondary mt-1">{subtitle}</p>}
      {trend && trendValue && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-secondary'}`}>
          <span>{trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  )
}
