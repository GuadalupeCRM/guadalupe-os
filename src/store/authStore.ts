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
  isAuthenticated: boolean
  setUser: (user: AuthState['user']) => void
  setProfile: (profile: AuthState['profile']) => void
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
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
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .eq('user_id', user.id)
      .single()
    if (data) get().setProfile(data)
  },
}))

// Padrão original que funcionava: onAuthStateChange como única fonte de verdade
// isLoading só vira false DEPOIS que profile é buscado — módulos só renderizam com auth completo
supabase.auth.onAuthStateChange(async (_event, session) => {
  const store = useAuthStore.getState()
  if (session?.user) {
    store.setUser({ id: session.user.id, email: session.user.email || '' })
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .eq('user_id', session.user.id)
      .single()
    if (data) store.setProfile(data)
  } else {
    store.setUser(null)
    store.setProfile(null)
  }
  useAuthStore.setState({ isLoading: false })
})
