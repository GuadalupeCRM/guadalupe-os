import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  // Timeout local: se após 5s ainda isLoading, força saída do loading
  // Isso garante que o componente nunca fica travado mesmo se o store falhar
  const [forceReady, setForceReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  const stillLoading = isLoading && !forceReady

  if (stillLoading) {
    return (
      <div className="min-h-screen bg-areia flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-verde-vivid border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-sans text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
