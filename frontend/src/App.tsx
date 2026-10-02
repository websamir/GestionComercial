import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import AsesorDashboard from './pages/asesor/Dashboard'
import DirectorDashboard from './pages/director/Dashboard'
import CompanyDashboard from './pages/company/Dashboard'
import AdminDashboard from './pages/admin/Dashboard'

function RootRedirect() {
  const { user, isAuthenticated, hydrated } = useAuthStore()
  if (!hydrated) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  switch (user?.rol) {
    case 'ASESOR': return <Navigate to="/asesor" replace />
    case 'DIRECTOR': return <Navigate to="/director" replace />
    case 'JEFE_CANAL': return <Navigate to="/empresa" replace />
    case 'ADMIN': return <Navigate to="/admin" replace />
    default: return <Navigate to="/login" replace />
  }
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/asesor"
          element={
            <ProtectedRoute roles={['ASESOR']}>
              <AsesorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/director"
          element={
            <ProtectedRoute roles={['DIRECTOR']}>
              <DirectorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empresa"
          element={
            <ProtectedRoute roles={['JEFE_CANAL', 'ADMIN']}>
              <CompanyDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
