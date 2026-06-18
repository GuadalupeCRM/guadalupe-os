import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Email ou senha incorretos')
      toast.error('Email ou senha incorretos')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (resetError) {
      setError('Não foi possível enviar o link. Verifique o email.')
      toast.error('Erro ao enviar link de redefinição')
    } else {
      setResetSent(true)
      toast.success('Link enviado! Confira seu email.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-areia flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-verde-vivid tracking-wide">Guadalupe</h1>
          <p className="text-gray-500 text-sm mt-1 font-sans font-medium uppercase tracking-widest">Sistema Operacional</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {mode === 'login' ? (
            <>
              <h2 className="font-serif text-2xl mb-6">Entrar</h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-sans font-700 uppercase tracking-wider text-gray-500 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-verde-vivid transition-colors"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-700 uppercase tracking-wider text-gray-500 mb-1">
                    Senha
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

                {error && (
                  <p className="text-rosa-vivid text-sm font-sans">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-rosa-vivid text-white font-sans font-semibold uppercase tracking-wider text-sm rounded-lg hover:bg-opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setResetSent(false) }}
                  className="w-full text-center text-xs font-sans text-gray-500 hover:text-verde-vivid transition-colors mt-2"
                >
                  Esqueci minha senha
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl mb-6">Redefinir senha</h2>

              {resetSent ? (
                <div className="text-center space-y-4">
                  <p className="text-sm font-sans text-gray-600">
                    Se o email <strong>{email}</strong> estiver cadastrado, você vai receber um link pra criar uma nova senha.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-sm font-sans text-verde-vivid hover:underline"
                  >
                    Voltar pro login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm font-sans text-gray-600 mb-2">
                    Digite seu email — vamos te mandar um link pra criar uma nova senha.
                  </p>
                  <div>
                    <label className="block text-xs font-sans font-700 uppercase tracking-wider text-gray-500 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-11 px-3 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-verde-vivid transition-colors"
                      placeholder="seu@email.com"
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
                    {loading ? 'Enviando...' : 'Enviar link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError('') }}
                    className="w-full text-center text-xs font-sans text-gray-500 hover:text-verde-vivid transition-colors mt-2"
                  >
                    Voltar pro login
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 font-sans">#BebaComModeração</p>
      </div>
    </div>
  )
}
