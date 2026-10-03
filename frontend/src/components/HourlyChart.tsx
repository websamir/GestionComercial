import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import type { HourlyDistribution } from '../types'
import { formatCOP } from './KPICard'

interface Props {
  data: HourlyDistribution[]
}

const formatHour = (h: number) => {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as HourlyDistribution
  return (
    <div className="bg-card border border-gray-200 rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-text-primary text-sm">{formatHour(d.hora)}</p>
      <p className="text-text-secondary"><span className="font-medium text-text-primary">{d.facturas}</span> facturas</p>
      <p className="text-text-secondary">Venta: <span className="font-medium text-text-primary">{formatCOP(d.venta)}</span></p>
    </div>
  )
}

export default function HourlyChart({ data }: Props) {
  if (!data || data.length === 0) return null

  // Fill all hours 0-23 with 0 if missing
  const full: HourlyDistribution[] = Array.from({ length: 24 }, (_, i) => {
    const found = data.find(d => d.hora === i)
    return found ?? { hora: i, facturas: 0, venta: 0 }
  })

  const maxFacturas = Math.max(...full.map(d => d.facturas), 1)
  const avg = full.reduce((s, d) => s + d.facturas, 0) / 24

  // Tag peak / valley / normal
  const tagged = full.map(d => ({
    ...d,
    label: formatHour(d.hora),
    tipo: d.facturas === 0 ? 'vacio'
        : d.facturas >= maxFacturas * 0.75 ? 'pico'
        : d.facturas <= avg * 0.4 ? 'valle'
        : 'normal',
  }))

  const colorMap: Record<string, string> = {
    pico:   '#2563EB',
    normal: '#93C5FD',
    valle:  '#BFDBFE',
    vacio:  '#E5E7EB',
  }

  const peakHour  = tagged.reduce((a, b) => b.facturas > a.facturas ? b : a)
  const valleyHour = tagged.filter(d => d.facturas > 0).reduce((a, b) => b.facturas < a.facturas ? b : a, tagged.find(d => d.facturas > 0)!)

  return (
    <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-text-primary">Distribución Horaria</h3>
        <div className="flex gap-3 text-xs text-text-secondary">
          {peakHour && (
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />
              Pico: <strong className="text-text-primary">{formatHour(peakHour.hora)}</strong> ({peakHour.facturas} fact.)
            </span>
          )}
          {valleyHour && valleyHour.facturas > 0 && (
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-blue-200 mr-1" />
              Valle: <strong className="text-text-primary">{formatHour(valleyHour.hora)}</strong> ({valleyHour.facturas} fact.)
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-text-secondary mb-3">Facturas por hora del día</p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={tagged} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            interval={1}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
          <ReferenceLine y={avg} stroke="#D1D5DB" strokeDasharray="4 4" />
          <Bar dataKey="facturas" radius={[3, 3, 0, 0]}>
            {tagged.map((entry, i) => (
              <Cell key={i} fill={colorMap[entry.tipo]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-2 text-xs text-text-secondary">
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary mr-1" />Hora pico ≥ 75% del máx.</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-200 mr-1" />Valle ≤ 40% del prom.</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-200 mr-1" />Sin actividad</span>
      </div>
    </div>
  )
}
