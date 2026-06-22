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

// Timeout de segurança — garante que isLoading resolve em no máximo 6s
// independente de qualquer falha de rede ou demora do Supabase
const safetyTimeout = setTimeout(() => {
  if (useAuthStore.getState().isLoading) {
    console.warn('[AuthStore] Timeout — forçando isLoading = false')
    useAuthStore.setState({ isLoading: false })
  }
}, 6000)

// onAuthStateChange é a fonte principal de verdade
// Supabase dispara INITIAL_SESSION quase imediatamente com o estado atual
supabase.auth.onAuthStateChange(async (event, session) => {
  clearTimeout(safetyTimeout) // cancela o timeout assim que o Supabase responde

  const store = useAuthStore.getState()

  if (session?.user) {
    store.setUser({ id: session.user.id, email: session.user.email || '' })
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .eq('user_id', session.user.id)
        .single()
      if (data) store.setProfile(data)
    } catch {
      // profile query falhou — não bloqueia o login
    }
  } else {
    store.setUser(null)
    store.setProfile(null)
  }

  // Sempre resolve o loading, independente do resultado
  useAuthStore.setState({ isLoading: false })
})
