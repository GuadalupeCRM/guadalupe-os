import { useAuthStore } from '../store/authStore'

const MODULE_ACCESS: Record<string, string[]> = {
  dashboard: ['admin', 'comercial', 'marketing', 'eventos', 'financeiro', 'vendedor'],
  financeiro: ['admin', 'financeiro'],
  crm: ['admin', 'comercial', 'marketing', 'eventos', 'financeiro'],
  eventos: ['admin', 'eventos'],
  estoque: ['admin', 'financeiro', 'comercial', 'eventos'],
  marketing: ['admin', 'marketing'],
  afiliadas: ['admin', 'marketing'],
  ads: ['admin', 'marketing'],
  b2c: ['admin', 'marketing'],
  relatorios: ['admin', 'financeiro'],
  configuracoes: ['admin'],
  'meu-pipeline': ['vendedor', 'comercial'],
}

export function useAuth() {
  const { user, profile, isLoading, isAuthenticated, logout } = useAuthStore()
  const role = profile?.role

  return {
    user,
    profile,
    role,
    isLoading,
    isAuthenticated,
    logout,
    isAdmin: role === 'admin',
    isComercial: role === 'comercial' || role === 'admin',
    isMarketing: role === 'marketing' || role === 'admin',
    isEventos: role === 'eventos' || role === 'admin',
    isFinanceiro: role === 'financeiro' || role === 'admin',
    isVendedor: role === 'vendedor',
    canAccess: (module: string) => {
      if (!role) return false
      const allowed = MODULE_ACCESS[module] || []
      return allowed.includes(role)
    },
  }
}
