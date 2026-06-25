import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('Erro de renderização capturado:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertTriangle size={28} className="text-rosa-vivid" />
          <p className="font-sans font-semibold text-gray-800">Não foi possível carregar esta página</p>
          <p className="font-sans text-sm text-gray-400 max-w-md">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid"
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
