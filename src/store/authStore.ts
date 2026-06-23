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

// Timeout helper — nenhuma chamada de rede fica pendente para sempre
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms)
    ),
  ])
}

async function fetchProfile(userId: string) {
  try {
    const query = (async () => {
      const { data } = await supabase
        .from('profiles').select('id, full_name, role, avatar_url')
        .eq('user_id', userId).maybeSingle()
      return data
    })()
    return await withTimeout(query, 5000)
  } catch {
    return null
  }
}

async function bootstrap() {
  try {
    // getSession() lê localStorage — rápido, mas protegemos com 3s
    const result = await withTimeout(supabase.auth.getSession(), 3000)
    const session = result.data.session

    if (session?.user) {
      useAuthStore.setState({
        user: { id: session.user.id, email: session.user.email || '' },
        isAuthenticated: true,
      })
      const profile = await fetchProfile(session.user.id)
      if (profile) useAuthStore.getState().setProfile(profile)
    }
  } catch (e) {
    // Se getSession() travou ou falhou: limpa sessão corrompida e manda pro login
    console.warn('[AuthStore] bootstrap falhou, limpando sessão:', e)
    try { await supabase.auth.signOut() } catch {}
  } finally {
    useAuthStore.setState({ isLoading: false })
  }
}

bootstrap()

// Escuta apenas login/logout futuros — INITIAL_SESSION já tratado acima
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
