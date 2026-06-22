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
    set({ user: null, profile: null, isAuthenticated: false })
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

// FIX: getSession imediato garante que isLoading resolve mesmo se
// onAuthStateChange demorar ou não disparar no carregamento inicial
async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
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
}

initAuth()

// Mantém onAuthStateChange para atualizações em tempo real (login/logout)
supabase.auth.onAuthStateChange(async (event, session) => {
  // Ignora INITIAL_SESSION — já tratado pelo initAuth acima
  if (event === 'INITIAL_SESSION') return
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
