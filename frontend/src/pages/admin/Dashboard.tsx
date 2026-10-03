import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import UploadExcel from './UploadExcel'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getUsers, createUser, updateUser, getUploadInfo } from '../../api/company'
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
  email: '', nombre: '', rol: 'ASESOR', password: '',
  cod_vend: undefined, desc_area: undefined,
}

interface UserFormProps {
  title: string
  initial: CreateUserPayload
  requirePassword: boolean
  onSubmit: (form: CreateUserPayload) => Promise<void>
  onCancel: () => void
  error: string
  loading: boolean
}

function UserForm({ title, initial, requirePassword, onSubmit, onCancel, error, loading }: UserFormProps) {
  const [form, setForm] = useState<CreateUserPayload>(initial)

  useEffect(() => { setForm(initial) }, [initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-bg rounded-xl border border-gray-100">
      <h4 className="text-sm font-semibold text-text-primary mb-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Nombre completo</label>
          <input type="text" required value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Nombre apellido" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Correo electrónico</label>
          <input type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="usuario@invesakk.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Contraseña {!requirePassword && <span className="text-text-secondary font-normal">(dejar vacío para no cambiar)</span>}
          </label>
          <input type="password" required={requirePassword} value={form.password ?? ''}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder={requirePassword ? 'Contraseña segura' : 'Nueva contraseña (opcional)'} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Rol</label>
          <select value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value as UserRole })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white">
            {ROL_OPTIONS.map((r) => (
              <option key={r} value={r}>{ROL_LABEL[r]}</option>
            ))}
          </select>
        </div>
        {form.rol === 'ASESOR' && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Código Vendedor</label>
            <input type="number" value={form.cod_vend ?? ''}
              onChange={(e) => setForm({ ...form, cod_vend: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Ej: 1234" />
          </div>
        )}
        {(form.rol === 'DIRECTOR') && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Tienda / Área</label>
            <input type="text" value={form.desc_area ?? ''}
              onChange={(e) => setForm({ ...form, desc_area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Nombre de tienda" />
          </div>
        )}
        {form.rol === 'JEFE_CANAL' && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Canal</label>
            <input type="text" value={(form as any).canal ?? ''}
              onChange={(e) => setForm({ ...form, ...(form as any), canal: e.target.value } as any)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Ej: VENTA EMPRESA" />
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-danger bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={loading}
          className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors disabled:opacity-60">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Edit form
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Toggle loading per user
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [globalMsg, setGlobalMsg] = useState('')

  // Search/filter
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState<string>('todos')

  const reload = () =>
    Promise.all([
      getUsers().then((r) => setUsers(r.data)),
      getUploadInfo().then((r) => setUploadInfo(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))

  useEffect(() => { reload() }, [])

  const handleCreate = async (form: CreateUserPayload) => {
    setCreateError('')
    setCreateLoading(true)
    try {
      await createUser(form)
      await reload()
      setShowCreate(false)
      setGlobalMsg('Usuario creado exitosamente.')
      setTimeout(() => setGlobalMsg(''), 3000)
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || 'Error al crear usuario')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async (form: CreateUserPayload) => {
    if (!editingUser) return
    setEditError('')
    setEditLoading(true)
    const payload: any = {
      nombre: form.nombre,
      email: form.email,
      rol: form.rol,
      cod_vend: form.cod_vend,
      desc_area: form.desc_area,
      canal: (form as any).canal,
    }
    if (form.password) payload.password = form.password
    try {
      await updateUser(editingUser.id, payload)
      await reload()
      setEditingUser(null)
      setGlobalMsg('Usuario actualizado.')
      setTimeout(() => setGlobalMsg(''), 3000)
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al actualizar usuario')
    } finally {
      setEditLoading(false)
    }
  }

  const handleToggleActivo = async (u: AdminUser) => {
    setTogglingId(u.id)
    try {
      await updateUser(u.id, { activo: !u.activo })
      await reload()
    } catch {
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.nombre.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRol = filterRol === 'todos' || u.rol === filterRol
    return matchSearch && matchRol
  })

  if (loading) return <LoadingSpinner fullScreen />

  const editInitial: CreateUserPayload = editingUser
    ? { nombre: editingUser.nombre, email: editingUser.email, rol: editingUser.rol,
        password: '', cod_vend: editingUser.cod_vend ?? undefined,
        desc_area: editingUser.desc_area ?? undefined }
    : emptyForm

  return (
    <Layout title="Administración" subtitle="Panel de administración INVESAKK">
      <div className="space-y-6">
        <UploadExcel info={uploadInfo} onUploaded={(info) => setUploadInfo(info)} />

        <div className="bg-card rounded-lg shadow-sm border border-gray-100 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Usuarios del Sistema</h3>
              <p className="text-xs text-text-secondary mt-0.5">{users.length} usuarios · {users.filter(u => u.activo).length} activos</p>
            </div>
            <button
              onClick={() => { setShowCreate(!showCreate); setCreateError('') }}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors"
            >
              {showCreate ? 'Cancelar' : '+ Nuevo Usuario'}
            </button>
          </div>

          {globalMsg && (
            <div className="mb-4 text-sm text-success bg-green-50 rounded-lg px-4 py-2">{globalMsg}</div>
          )}

          {/* Create form */}
          {showCreate && (
            <UserForm
              title="Nuevo Usuario"
              initial={emptyForm}
              requirePassword
              onSubmit={handleCreate}
              onCancel={() => { setShowCreate(false); setCreateError('') }}
              error={createError}
              loading={createLoading}
            />
          )}

          {/* Edit form */}
          {editingUser && (
            <UserForm
              title={`Editar: ${editingUser.nombre}`}
              initial={editInitial}
              requirePassword={false}
              onSubmit={handleEdit}
              onCancel={() => { setEditingUser(null); setEditError('') }}
              error={editError}
              loading={editLoading}
            />
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <select value={filterRol} onChange={(e) => setFilterRol(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white">
              <option value="todos">Todos los roles</option>
              {ROL_OPTIONS.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Nombre</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Email</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Rol</th>
                  <th className="text-left py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Cód / Área</th>
                  <th className="text-center py-2 pr-3 text-xs font-semibold uppercase text-text-secondary">Estado</th>
                  <th className="text-right py-2 text-xs font-semibold uppercase text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                    <td className="py-2 pr-3 font-medium text-text-primary whitespace-nowrap">{u.nombre}</td>
                    <td className="py-2 pr-3 text-text-secondary text-xs">{u.email}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${rolBadge[u.rol]}`}>
                        {ROL_LABEL[u.rol]}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-text-secondary font-mono text-xs">
                      {u.cod_vend ?? u.desc_area ?? '—'}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {u.rol === 'ADMIN' ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-success">
                          Activo
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleActivo(u)}
                          disabled={togglingId === u.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                            u.activo
                              ? 'bg-green-100 text-success hover:bg-red-50 hover:text-danger'
                              : 'bg-red-100 text-danger hover:bg-green-50 hover:text-success'
                          } disabled:opacity-50`}
                          title={u.activo ? 'Click para inactivar' : 'Click para activar'}
                        >
                          {togglingId === u.id ? '...' : u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => { setEditingUser(u); setShowCreate(false); setEditError('') }}
                        className="text-xs text-accent hover:text-primary font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-secondary text-sm">
                      No hay usuarios que coincidan con la búsqueda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-text-secondary">
            Contraseña por defecto para usuarios creados automáticamente: <code className="bg-gray-100 px-1 rounded">Invesakk2024</code>
          </p>
        </div>
      </div>
    </Layout>
  )
}
