import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/formatters'
import { TrendingUp, Users, AlertTriangle, Target } from 'lucide-react'

function KPICard({ label, value, color = 'verde' }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    verde: 'text-verde-vivid',
    rosa: 'text-rosa-vivid',
    amarelo: 'text-amarelo-vivid',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-sans font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className={`font-serif text-3xl ${colors[color] || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { profile, isAdmin, isFinanceiro, isMarketing, isEventos } = useAuth()

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = profile?.full_name?.split(' ')[0] || ''

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-gray-900">{greeting}, {nome}</h1>
        <p className="text-gray-500 font-sans mt-1">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPIs por role */}
      {(isAdmin || isFinanceiro) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Caixa Atual" value="—" color="verde" />
          <KPICard label="Receita da Semana" value="—" color="verde" />
          <KPICard label="Leads Ativos" value="—" />
          <KPICard label="Breakeven" value="0%" color="amarelo" />
        </div>
      )}

      {isMarketing && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Seguidores IG" value="—" />
          <KPICard label="Afiliadas Ativas" value="—" color="verde" />
          <KPICard label="Budget Ads" value="—%" />
          <KPICard label="Conversões B2C" value="—" />
        </div>
      )}

      {isEventos && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Eventos Este Mês" value="—" />
          <KPICard label="Em Execução" value="—" color="amarelo" />
          <KPICard label="Receita Eventos" value="—" color="verde" />
          <KPICard label="UGCs Gerados" value="—" />
        </div>
      )}

      {/* Ritual diário */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-serif text-xl mb-4">Ritual de Hoje</h2>
        <div className="space-y-3">
          {['Revisar leads sem atividade (+24h)', 'Verificar posição de caixa', 'Conferir NFs pendentes no Bling'].map((item, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-verde-vivid" />
              <span className="font-sans text-sm text-gray-700">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Placeholder para agentes */}
      <div className="mt-6 bg-verde-pale border border-verde-mid rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-verde-vivid rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Target size={14} className="text-white" />
          </div>
          <div>
            <p className="font-sans font-semibold text-sm text-verde-vivid">Agente Financeiro</p>
            <p className="font-sans text-sm text-gray-600 mt-1">
              Configure as credenciais no arquivo .env.local para ativar os agentes de IA.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
