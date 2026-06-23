import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

interface AuthState {
  user: { id: string; email: string } | null
  profile: { id: string; full_name: string; role: UserRole; avatar_url?: string } | null
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
      .from('profiles').select('id, full_name, role, avatar_url')
      .eq('user_id', user.id).maybeSingle()
    if (data) get().setProfile(data)
  },
}))

async function fetchProfile(userId: string) {
  const { data } = await supabase
    .from('profiles').select('id, full_name, role, avatar_url')
    .eq('user_id', userId).maybeSingle()
  return data
}

// BOOTSTRAP: getSession() garante que o JWT está aplicado ANTES de qualquer from()
// Isso evita o deadlock onde onAuthStateChange faz from() enquanto o client ainda inicializa
async function bootstrap() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      useAuthStore.setState({
        user: { id: session.user.id, email: session.user.email || '' },
        isAuthenticated: true,
      })
      const profile = await fetchProfile(session.user.id)
      if (profile) useAuthStore.getState().setProfile(profile)
    }
  } catch (e) {
    console.error('[AuthStore] bootstrap error', e)
  } finally {
    useAuthStore.setState({ isLoading: false })
  }
}

bootstrap()

// Só escuta mudanças futuras (login/logout) — ignora INITIAL_SESSION (já tratado acima)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION') return

  if (session?.user) {
    useAuthStore.setState({
      user: { id: session.user.id, email: session.user.email || '' },
      isAuthenticated: true,
    })
    const profile = await fetchProfile(session.user.id)
    if (profile) useAuthStore.getState().setProfile(profile)
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, profile: null, isAuthenticated: false })
  }
})
