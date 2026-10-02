import client from './client'
import type { LoginResponse } from '../types'

export const login = (email: string, password: string) =>
  client.post<LoginResponse>('/auth/login', { email, password })

export const getMe = () => client.get('/auth/me')
