import { useState } from 'react'
import Sidebar from './Sidebar'
import { useAuthStore } from '../store/auth'

interface Props {
  children: React.ReactNode
  title: string
  subtitle?: string
  periodo?: string
  onPeriodoChange?: (p: string) => void
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function formatPeriodo(p: string) {
  const [year, month] = p.split('-')
  return `${MESES[parseInt(month) - 1]} ${year}`
}

export default function Layout({ children, title, subtitle, periodo, onPeriodoChange }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuthStore()

  const initials = user?.nombre
    ? user.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'U'

  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3 px-4 h-14">
            {/* Hamburger mobile */}
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            {/* Search bar */}
            <div className="flex-1 hidden sm:flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 max-w-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar tiendas, asesores, clientes..."
                className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full"
                readOnly
              />
            </div>

            <div className="flex-1 sm:hidden">
              <h1 className="text-sm font-bold text-gray-800 truncate">{title}</h1>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Period display */}
              {periodo && (
                <span className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 cursor-default select-none">
                  {formatPeriodo(periodo)}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              )}

              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
              </button>

              {/* User avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200 cursor-default">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 truncate max-w-[120px]">
                  {user?.nombre?.split(' ')[0]}
                </span>
                <svg className="hidden md:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
