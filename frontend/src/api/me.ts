import client from './client'
import type { AsesorDashboardData } from '../types'

export const getMeDashboard = (params?: { periodo?: string; fecha_inicio?: string; fecha_fin?: string }) =>
  client.get<AsesorDashboardData>('/me/dashboard', { params })

export const getMeSales = (params?: { periodo?: string }) =>
  client.get('/me/sales', { params })

export const getMeProducts = (params?: { periodo?: string }) =>
  client.get('/me/products', { params })
