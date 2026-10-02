import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

interface NavItem {
  path: string
  label: string
  icon: string
}

const navByRole: Record<string, NavItem[]> = {
  ASESOR: [
    { path: '/asesor', label: 'Mi Dashboard', icon: '📊' },
  ],
  DIRECTOR: [
    { path: '/director', label: 'Mi Tienda', icon: '🏪' },
  ],
  JEFE_CANAL: [
    { path: '/empresa', label: 'Empresa', icon: '🏢' },
  ],
  ADMIN: [
    { path: '/empresa', label: 'Empresa', icon: '🏢' },
    { path: '/admin', label: 'Administración', icon: '⚙️' },
  ],
}

const rolLabel: Record<string, string> = {
  ASESOR: 'Asesor',
  DIRECTOR: 'Director',
  JEFE_CANAL: 'Jefe de Canal',
  ADMIN: 'Administrador',
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuthStore()
  const items = user ? (navByRole[user.rol] ?? []) : []

  return (
    <>
      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-primary flex flex-col z-30 transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-primary-light">
          <div className="text-white font-bold text-lg tracking-tight">INVESAKK</div>
          <div className="text-blue-200 text-xs mt-0.5">Gestión Comercial</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-accent text-white'
                  : 'text-blue-100 hover:bg-primary-light hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-primary-light">
          <div className="mb-2">
            <p className="text-white text-sm font-semibold truncate">{user?.nombre}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-accent text-white font-medium">
              {user ? rolLabel[user.rol] : ''}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full mt-2 px-3 py-2 text-xs text-blue-200 hover:text-white hover:bg-primary-light rounded-lg transition-colors text-left"
          >
            ← Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
