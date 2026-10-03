import client from './client'
import type { DirectorDashboardData, AsesorDashboardData } from '../types'

export const getStoreDashboard = (params?: { periodo?: string; fecha_inicio?: string; fecha_fin?: string }) =>
  client.get<DirectorDashboardData>('/store/dashboard', { params })

export const getStoreAdvisor = (codVend: number, params?: { periodo?: string }) =>
  client.get<AsesorDashboardData>(`/store/advisor/${codVend}`, { params })
