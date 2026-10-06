import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getAccessControl } from '../../api/company'

const ROL_OPTIONS = ['ASESOR', 'DIRECTOR', 'JEFE_CANAL', 'ADMIN'] as const
const ROL_LABEL: Record<string, string> = {
  ASESOR: 'Asesor', DIRECTOR: 'Director', JEFE_CANAL: 'Jefe de Canal', ADMIN: 'Administrador',
}
const rolBadge: Record<string, string> = {
  ASESOR: 'bg-blue-100 text-blue-700', DIRECTOR: 'bg-purple-100 text-purple-700',
  JEFE_CANAL: 'bg-amber-100 text-amber-700', ADMIN: 'bg-red-100 text-red-700',
}

function fmtUltimoAcceso(iso: string | null): { text: string; hoy: boolean; ayer: boolean } {
  if (!iso) return { text: 'Sin registro', hoy: false, ayer: false }
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'))
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })
  if (diffDays === 0) return { text: `Hoy ${hora}`, hoy: true, ayer: false }
  if (diffDays === 1) return { text: `Ayer ${hora}`, hoy: false, ayer: true }
  return { text: `Hace ${diffDays} días`, hoy: false, ayer: false }
}

export default function AccessControlPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState('todos')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    getAccessControl()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    getAccessControl().then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  if (loading) return <LoadingSpinner fullScreen />

  const usuariosFiltrados: any[] = (data?.usuarios ?? []).filter((u: any) => {
    const q = search.toLowerCase()
    return (
      (u.nombre?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) &&
      (filterRol === 'todos' || u.rol === filterRol)
    )
  })
  const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const usuarios = usuariosFiltrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const totalIngresos = (data?.usuarios ?? []).reduce((s: number, u: any) => s + (u.total_ingresos || 0), 0)

  return (
    <Layout title="Control de Acceso" subtitle="Registro de ingresos por usuario">
      <div className="space-y-5">

        {/* ── Greeting header ── */}
        <div className="rounded-2xl px-6 py-5 flex flex-wrap items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #1a2e4a 0%, #1e3a5f 50%, #2563eb 100%)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Administración</p>
            <h1 className="text-2xl font-bold text-white leading-tight">Control de Acceso</h1>
            <p className="text-sm text-white/60 mt-0.5">Monitoreo de sesiones e ingresos al sistema</p>
          </div>
          <button onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Actualizar
          </button>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl shadow-sm p-4" style={{ background: '#2563EB12', borderBottom: '3px solid #2563EB' }}>
            <p className="text-2xl font-bold text-gray-900">{data?.total_ingresos_hoy ?? 0}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1.5" style={{ color: '#2563EB' }}>Ingresos hoy</p>
          </div>
          <div className="rounded-xl shadow-sm p-4" style={{ background: '#16a34a12', borderBottom: '3px solid #16a34a' }}>
            <p className="text-2xl font-bold text-gray-900">{data?.usuarios_activos_hoy ?? 0}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1.5" style={{ color: '#16a34a' }}>Usuarios activos hoy</p>
          </div>
          <div className="rounded-xl shadow-sm p-4" style={{ background: '#8B5CF612', borderBottom: '3px solid #8B5CF6' }}>
            <p className="text-2xl font-bold text-gray-900">{totalIngresos}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1.5" style={{ color: '#8B5CF6' }}>Ingresos totales</p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar usuario..."
              className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select value={filterRol} onChange={(e) => { setFilterRol(e.target.value); setPage(1) }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              <option value="todos">Todos los roles</option>
              {ROL_OPTIONS.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
            <span className="self-center text-xs text-gray-400">{usuariosFiltrados.length} usuarios</span>
          </div>

          <div className="overflow-x-auto" style={{ maxHeight: '480px', overflowY: 'auto' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Usuario</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Rol</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Tienda / Canal</th>
                  <th className="text-right py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Total ingresos</th>
                  <th className="text-right py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Hoy</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Último acceso</th>
                  <th className="text-center py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Estado</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u: any) => {
                  const { text, hoy } = fmtUltimoAcceso(u.ultimo_acceso)
                  const activoHoy = u.ingresos_hoy > 0
                  const sinRegistro = !u.ultimo_acceso
                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-gray-800 whitespace-nowrap">{u.nombre}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${rolBadge[u.rol] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ROL_LABEL[u.rol] ?? u.rol}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-gray-500">{u.desc_area ?? u.canal ?? '—'}</td>
                      <td className="py-2.5 pr-3 text-right font-mono font-semibold text-gray-700">{u.total_ingresos}</td>
                      <td className="py-2.5 pr-3 text-right">
                        <span className={`font-mono font-semibold ${u.ingresos_hoy > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {u.ingresos_hoy}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-gray-500 whitespace-nowrap">{text}</td>
                      <td className="py-2.5 text-center">
                        {activoHoy ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">● Activo hoy</span>
                        ) : sinRegistro ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Sin registro</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactivo</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400 text-sm">
                      Sin datos de acceso aún. Los registros aparecerán desde el próximo login.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, usuariosFiltrados.length)} de {usuariosFiltrados.length} usuarios
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                      n === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
