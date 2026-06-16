import { useNavigate } from 'react-router-dom'
export default function AccessDenied() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen bg-areia flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <h1 className="font-serif text-3xl text-rosa-vivid mb-3">Acesso restrito</h1>
        <p className="font-sans text-gray-500 mb-6">Você não tem permissão para acessar esta área.</p>
        <button onClick={() => nav('/dashboard')} className="bg-verde-vivid text-white font-sans font-semibold px-6 py-3 rounded-lg hover:bg-verde-mid transition-colors">
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )
}
