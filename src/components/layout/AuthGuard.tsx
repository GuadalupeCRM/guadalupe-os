import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-areia flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-verde-vivid border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-sans text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null
  return <>{children}</>
}
