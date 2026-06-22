import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

interface AuthState {
  user: { id: string; email: string } | null
  profile: {
    id: string
    full_name: string
    role: UserRole
    avatar_url?: string
  } | null
  isLoading: boolean
  isProfileLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AuthState['user']) => void
  setProfile: (profile: AuthState['profile']) => void
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('user_id', userId)
    .single()
  if (error) console.error('[AuthStore] profile fetch error:', error.message)
  return data ?? null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isProfileLoading: false,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, isAuthenticated: false, isLoading: false })
  },

  refreshProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const data = await fetchProfile(user.id)
    if (data) get().setProfile(data)
  },
}))

// Timeout de segurança — garante que isLoading resolve em no máximo 8s
const safetyTimeout = setTimeout(() => {
  const s = useAuthStore.getState()
  if (s.isLoading) {
    console.warn('[AuthStore] safety timeout fired')
    useAuthStore.setState({ isLoading: false })
  }
}, 8000)

supabase.auth.onAuthStateChange(async (event, session) => {
  clearTimeout(safetyTimeout)

  if (session?.user) {
    // 1. Marca autenticado e sai do loading imediatamente
    useAuthStore.setState({
      user: { id: session.user.id, email: session.user.email || '' },
      isAuthenticated: true,
      isLoading: false,
      isProfileLoading: true,
    })
    // 2. Busca profile em background (não bloqueia a UI)
    const profile = await fetchProfile(session.user.id)
    useAuthStore.setState({ profile, isProfileLoading: false })
  } else {
    useAuthStore.setState({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      isProfileLoading: false,
    })
  }
})
