import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const rolLabel: Record<string, string> = {
  ASESOR: 'Asesor',
  DIRECTOR: 'Director',
  JEFE_CANAL: 'Jefe de Canal',
  ADMIN: 'Administrador',
}

// SVG icon components
const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS: Record<string, string> = {
  inicio:       'M3 12L12 3l9 9M5 10v10h5v-6h4v6h5V10',
  ventas:       'M3 3h18v18H3zM9 9h6M9 12h6M9 15h4',
  tiendas:      'M3 9l9-6 9 6v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
  asesores:     'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  clientes:     'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8',
  productos:    'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  convenios:    'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  facturacion:  'M9 12h6M9 16h6M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7',
  reportes:     'M18 20V10M12 20V4M6 20v-6',
  configuracion:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0',
  admin:        'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  mi_tienda:    'M3 9l9-6 9 6v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
  dashboard:    'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4',
}

interface NavItem {
  path: string
  label: string
  icon: keyof typeof ICONS
  end?: boolean
}

const navByRole: Record<string, NavItem[]> = {
  ASESOR: [
    { path: '/asesor', label: 'Mi Dashboard', icon: 'inicio', end: true },
  ],
  DIRECTOR: [
    { path: '/director', label: 'Mi Tienda', icon: 'mi_tienda', end: true },
  ],
  JEFE_CANAL: [
    { path: '/empresa', label: 'Inicio', icon: 'inicio', end: true },
    { path: '/convenios', label: 'Convenios', icon: 'convenios' },
  ],
  ADMIN: [
    { path: '/empresa', label: 'Inicio', icon: 'inicio', end: true },
    { path: '/convenios', label: 'Convenios', icon: 'convenios' },
    { path: '/admin/accesos', label: 'Control de Acceso', icon: 'admin' },
    { path: '/admin', label: 'Configuración', icon: 'configuracion' },
  ],
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const items = user ? (navByRole[user.rol] ?? []) : []

  const initials = user?.nombre
    ? user.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'U'

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-60 flex flex-col z-30 transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, #1a2e4a 0%, #152438 100%)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight leading-none">INVESAKK</div>
            <div className="text-blue-300 text-xs mt-0.5 leading-none">Gestión Comercial</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {items.map((item, i) => (
            <NavLink
              key={`${item.path}-${i}`}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive && item.end
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="flex-shrink-0 opacity-80">
                <Icon d={ICONS[item.icon]} size={17} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 border-t border-white/10" />

        {/* User section */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">{user?.nombre}</p>
              <p className="text-blue-300 text-xs mt-0.5 truncate">{user ? rolLabel[user.rol] : ''}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Cerrar sesión
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <p className="text-blue-400 text-xs text-center">INVESAKK v2.0</p>
          <p className="text-blue-500 text-xs text-center">© 2026 Gestión Comercial</p>
        </div>
      </aside>
    </>
  )
}
