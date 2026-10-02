import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import type { UserRole } from '../types'

interface Props {
  children: React.ReactNode
  roles?: UserRole[]
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, hydrated, user } = useAuthStore()

  if (!hydrated) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.rol)) {
    // Redirect to appropriate dashboard
    switch (user.rol) {
      case 'ASESOR': return <Navigate to="/asesor" replace />
      case 'DIRECTOR': return <Navigate to="/director" replace />
      case 'JEFE_CANAL': return <Navigate to="/empresa" replace />
      case 'ADMIN': return <Navigate to="/admin" replace />
    }
  }

  return <>{children}</>
}
