import client from './client'
import type { CompanyDashboardData, AdminUser, CreateUserPayload, UploadInfo } from '../types'

export const getCompanyDashboard = (params?: { periodo?: string }) =>
  client.get<CompanyDashboardData>('/company/dashboard', { params })

// Admin endpoints
export const getUsers = () => client.get<AdminUser[]>('/admin/users')

export const createUser = (payload: CreateUserPayload) =>
  client.post<AdminUser>('/admin/users', payload)

export const updateUser = (id: number, payload: Partial<CreateUserPayload>) =>
  client.put<AdminUser>(`/admin/users/${id}`, payload)

export const deleteUser = (id: number) => client.delete(`/admin/users/${id}`)

export const getUploadInfo = () => client.get<UploadInfo>('/admin/upload/info')

export const uploadExcel = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return client.post<UploadInfo>('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
