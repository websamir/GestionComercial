import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import type { BrandSale, BodegaSale } from '../types'
import { formatCOP } from './KPICard'

const COLORS = ['#1E3A5F', '#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D']

const formatAxis = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

const BrandTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-text-primary">{payload[0].payload.marca || payload[0].payload.bodega}</p>
        <p className="text-accent">{formatCOP(payload[0].value)}</p>
        <p className="text-text-secondary">{payload[0].payload.participacion?.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

interface BrandsBarProps {
  data: BrandSale[]
  title?: string
}

export function BrandsBarChart({ data, title = 'Ventas por Marca' }: BrandsBarProps) {
  const top = data.slice(0, 8)
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
      <div className="space-y-2">
        {top.map((item, i) => {
          const pct = top[0]?.venta > 0 ? (item.venta / top[0].venta) * 100 : 0
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-28 truncate flex-shrink-0">{item.marca || 'Sin marca'}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
              <span className="text-xs font-semibold text-text-primary w-20 text-right flex-shrink-0">{formatAxis(item.venta)}</span>
              <span className="text-xs text-text-secondary w-10 text-right flex-shrink-0">{item.participacion?.toFixed(0)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface BodegaPieProps {
  data: BodegaSale[]
  title?: string
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function BodegaPieChart({ data, title = 'Ventas por Bodega' }: BodegaPieProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="venta"
            nameKey="bodega"
            cx="50%"
            cy="50%"
            outerRadius={80}
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCOP(value)} />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => <span className="text-text-secondary">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface BrandsPieProps {
  data: BrandSale[]
  title?: string
}

export function BrandsPieChart({ data, title = 'Participación por Marca' }: BrandsPieProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="venta"
            nameKey="marca"
            cx="50%"
            cy="50%"
            outerRadius={90}
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCOP(value)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
