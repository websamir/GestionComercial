import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { DailySale } from '../types'
import { formatCOP } from './KPICard'

interface Props {
  data: DailySale[]
  title?: string
}

const formatAxis = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-text-primary mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {formatCOP(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function SalesChart({ data, title = 'Evolución de Ventas' }: Props) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatAxis}
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="venta"
            name="Venta Día"
            stroke="#2563EB"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {data[0]?.acumulado !== undefined && (
            <Line
              type="monotone"
              dataKey="acumulado"
              name="Acumulado"
              stroke="#16A34A"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
