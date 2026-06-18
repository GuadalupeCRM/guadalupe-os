import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('Não foi possível atualizar a senha. O link pode ter expirado — peça um novo.')
      toast.error('Erro ao atualizar senha')
    } else {
      toast.success('Senha atualizada! Pode entrar normalmente agora.')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-areia flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-verde-vivid tracking-wide">Guadalupe</h1>
          <p className="text-gray-500 text-sm mt-1 font-sans font-medium uppercase tracking-widest">Sistema Operacional</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h2 className="font-serif text-2xl mb-6">Criar nova senha</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-sans font-700 uppercase tracking-wider text-gray-500 mb-1">
                Nova senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 px-3 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-verde-vivid transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-sans font-700 uppercase tracking-wider text-gray-500 mb-1">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full h-11 px-3 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-verde-vivid transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-rosa-vivid text-sm font-sans">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-rosa-vivid text-white font-sans font-semibold uppercase tracking-wider text-sm rounded-lg hover:bg-opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
