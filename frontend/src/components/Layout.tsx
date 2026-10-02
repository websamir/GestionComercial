import { useState } from 'react'
import Sidebar from './Sidebar'

interface Props {
  children: React.ReactNode
  title: string
  subtitle?: string
  periodo?: string
  onPeriodoChange?: (p: string) => void
  periodos?: string[]
}

// Generate last 12 months as YYYY-MM options
function generatePeriodos(): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    result.push(`${year}-${month}`)
  }
  return result
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function formatPeriodo(p: string) {
  const [year, month] = p.split('-')
  return `${MESES[parseInt(month) - 1]} ${year}`
}

export default function Layout({ children, title, subtitle, periodo, onPeriodoChange, periodos }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const allPeriodos = periodos ?? generatePeriodos()

  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-card border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Hamburger */}
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-text-secondary"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="block w-5 h-0.5 bg-current mb-1" />
              <span className="block w-5 h-0.5 bg-current mb-1" />
              <span className="block w-5 h-0.5 bg-current" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-text-primary truncate">{title}</h1>
              {subtitle && <p className="text-xs text-text-secondary truncate">{subtitle}</p>}
            </div>

            {/* Period selector */}
            {onPeriodoChange && (
              <select
                value={periodo}
                onChange={(e) => onPeriodoChange(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                {allPeriodos.map((p) => (
                  <option key={p} value={p}>{formatPeriodo(p)}</option>
                ))}
              </select>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
