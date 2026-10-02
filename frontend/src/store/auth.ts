import { create } from 'zustand'
import { login as apiLogin } from '../api/auth'
import type { User } from '../types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  hydrated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  hydrated: false,

  hydrate: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ token, user, isAuthenticated: true, hydrated: true })
        return
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    set({ hydrated: true })
  },

  login: async (email: string, password: string) => {
    const response = await apiLogin(email, password)
    const { access_token, user } = response.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token: access_token, user, isAuthenticated: true, hydrated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
