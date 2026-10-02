import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import UploadExcel from './UploadExcel'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getUsers, createUser, getUploadInfo } from '../../api/company'
import type { AdminUser, CreateUserPayload, UploadInfo, UserRole } from '../../types'

const ROL_OPTIONS: UserRole[] = ['ASESOR', 'DIRECTOR', 'JEFE_CANAL', 'ADMIN']
const ROL_LABEL: Record<UserRole, string> = {
  ASESOR: 'Asesor',
  DIRECTOR: 'Director',
  JEFE_CANAL: 'Jefe de Canal',
  ADMIN: 'Administrador',
}

const rolBadge: Record<UserRole, string> = {
  ASESOR: 'bg-blue-100 text-accent',
  DIRECTOR: 'bg-purple-100 text-purple-700',
  JEFE_CANAL: 'bg-amber-100 text-warning',
  ADMIN: 'bg-red-100 text-danger',
}

const emptyForm: CreateUserPayload = {
  email: '',
  nombre: '',
  rol: 'ASESOR',
  password: '',
  cod_vend: undefined,
  desc_area: undefined,
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateUserPayload>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      getUsers().then((r) => setUsers(r.data)),
      getUploadInfo().then((r) => setUploadInfo(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setFormLoading(true)
    try {
      await createUser(form)
      const updated = await getUsers()
      setUsers(updated.data)
      setForm(emptyForm)
      setShowForm(false)
      setFormSuccess('Usuario creado exitosamente')
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Error al crear usuario')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <Layout title="Administración" subtitle="Panel de administración INVESAKK">
      <div className="space-y-6">
        {/* Upload section */}
        <UploadExcel info={uploadInfo} onUploaded={(info) => setUploadInfo(info)} />

        {/* Users section */}
        <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Usuarios del Sistema</h3>
            <button
              onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess('') }}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors"
            >
              {showForm ? 'Cancelar' : '+ Nuevo Usuario'}
            </button>
          </div>

          {formSuccess && (
            <div className="mb-4 text-sm text-success bg-green-50 rounded-lg px-4 py-2">{formSuccess}</div>
          )}

          {/* Add user form */}
          {showForm && (
            <form onSubmit={handleCreateUser} className="mb-6 p-4 bg-bg rounded-xl border border-gray-100">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Nuevo Usuario</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Nombre completo</label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Nombre apellido"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="usuario@invesakk.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Contraseña segura"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Rol</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white"
                  >
                    {ROL_OPTIONS.map((r) => (
                      <option key={r} value={r}>{ROL_LABEL[r]}</option>
                    ))}
                  </select>
                </div>
                {form.rol === 'ASESOR' && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Código Vendedor</label>
                    <input
                      type="number"
                      value={form.cod_vend ?? ''}
                      onChange={(e) => setForm({ ...form, cod_vend: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Ej: 1234"
                    />
                  </div>
                )}
                {(form.rol === 'DIRECTOR' || form.rol === 'JEFE_CANAL') && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Área / Tienda</label>
                    <input
                      type="text"
                      value={form.desc_area ?? ''}
                      onChange={(e) => setForm({ ...form, desc_area: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Nombre de tienda o área"
                    />
                  </div>
                )}
              </div>
              {formError && (
                <p className="mt-3 text-sm text-danger bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}
              <button
                type="submit"
                disabled={formLoading}
                className="mt-4 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors disabled:opacity-60"
              >
                {formLoading ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          )}

          {/* Users table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold uppercase text-text-secondary">Nombre</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold uppercase text-text-secondary">Email</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold uppercase text-text-secondary">Rol</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold uppercase text-text-secondary">Código</th>
                  <th className="text-left py-2 text-xs font-semibold uppercase text-text-secondary">Estado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-text-primary">{u.nombre}</td>
                    <td className="py-2 pr-4 text-text-secondary">{u.email}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${rolBadge[u.rol]}`}>
                        {ROL_LABEL[u.rol]}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-text-secondary font-mono text-xs">
                      {u.cod_vend ?? u.desc_area ?? '—'}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs font-medium ${u.activo ? 'text-success' : 'text-danger'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-secondary text-sm">
                      No hay usuarios registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
