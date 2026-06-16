import toast from 'react-hot-toast'
import { Bot, Calendar, Sparkles, AlertTriangle, ArrowRightLeft, Lightbulb, ShieldAlert } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatters'
import { useAuth } from '../../../hooks/useAuth'
import { useAdAgentReviews, useAdsBudgetSettings, useRequestAdsReview, useSetAdsAgentAutopause } from '../../../hooks/useAds'
import { healthScoreColor, TIER_LABELS } from '../constants'
import type { AdAgentReview } from '../../../types'

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `Semana de ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

function ReviewCard({ review }: { review: AdAgentReview }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <p className="font-sans text-sm font-semibold text-gray-700">{formatWeek(review.week_start)}</p>
        </div>
        <div className="text-right">
          <p className={`font-serif text-3xl ${healthScoreColor(review.health_score)}`}>{review.health_score}</p>
          <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Health Score</p>
        </div>
      </div>

      {review.summary && <p className="font-sans text-sm text-gray-600">{review.summary}</p>}

      {review.campaigns_to_pause.length > 0 && (
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-rosa-vivid mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Campanhas para pausar
          </p>
          <div className="space-y-1.5">
            {review.campaigns_to_pause.map((c, i) => (
              <div key={i} className="bg-rosa-pale rounded-lg p-2.5">
                <p className="font-sans text-sm font-semibold text-gray-800">{c.campaign}</p>
                <p className="font-sans text-xs text-gray-500">{c.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {review.budget_suggestions.length > 0 && (
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-amarelo-vivid mb-1.5 flex items-center gap-1.5">
            <ArrowRightLeft size={12} /> Sugestões de realocação de budget
          </p>
          <div className="space-y-1.5">
            {review.budget_suggestions.map((b, i) => (
              <div key={i} className="bg-amarelo-pale rounded-lg p-2.5">
                <p className="font-sans text-sm font-semibold text-gray-800">
                  {TIER_LABELS[b.from]} → {TIER_LABELS[b.to]} ({formatCurrency(b.amount)})
                </p>
                <p className="font-sans text-xs text-gray-500">{b.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {review.creative_patterns.length > 0 && (
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-verde-vivid mb-1.5 flex items-center gap-1.5">
            <Lightbulb size={12} /> Padrões de criativos de melhor performance
          </p>
          <ul className="space-y-1">
            {review.creative_patterns.map((p, i) => (
              <li key={i} className="font-sans text-sm text-gray-600 pl-3 border-l-2 border-verde-mid">{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function AgenteTab() {
  const { profile } = useAuth()
  const { data: reviews, isLoading } = useAdAgentReviews()
  const { data: settings } = useAdsBudgetSettings()
  const requestReview = useRequestAdsReview()
  const setAutopause = useSetAdsAgentAutopause()

  const isAdmin = profile?.role === 'admin'
  const latest = reviews?.[0]
  const history = (reviews ?? []).slice(1)

  const handleRequest = async () => {
    try {
      await requestReview.mutateAsync()
      toast.success('Análise concluída')
    } catch {
      toast.error('Erro ao solicitar análise')
    }
  }

  const handleToggleAutopause = async () => {
    if (!settings) return
    try {
      await setAutopause.mutateAsync(!settings.autopause)
      toast.success(settings.autopause ? 'Pausa automática desativada' : 'Pausa automática ativada')
    } catch {
      toast.error('Erro ao atualizar configuração')
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-verde-pale border border-verde-mid rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-verde-vivid rounded-full flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-sans text-sm font-semibold text-verde-vivid">Agente de Análise de Ads</p>
          <p className="font-sans text-xs text-gray-600 mt-0.5">
            Analisa o desempenho das campanhas e sugere pausas, realocação de budget e padrões de criativos de alta performance.
            Revisão automática toda segunda-feira às 09:00 (horário de Brasília).
          </p>
        </div>
        <button onClick={handleRequest} disabled={requestReview.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50 flex-shrink-0">
          <Sparkles size={14} /> {requestReview.isPending ? 'Analisando...' : 'Solicitar análise'}
        </button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando análises...</p>
      ) : !latest ? (
        <p className="font-sans text-sm text-gray-400 text-center py-8">Nenhuma análise registrada ainda.</p>
      ) : (
        <ReviewCard review={latest} />
      )}

      {isAdmin && settings && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-rosa-vivid flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-sans text-sm font-semibold text-gray-700">Agente pode pausar campanhas automaticamente?</p>
              <p className="font-sans text-xs text-gray-400 mt-0.5">Ação sensível — desativado por padrão. Requer aprovação do admin.</p>
            </div>
          </div>
          <button
            onClick={handleToggleAutopause}
            disabled={setAutopause.isPending}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.autopause ? 'bg-rosa-vivid' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.autopause ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Histórico de análises</p>
          <div className="space-y-3">
            {history.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        </div>
      )}
    </div>
  )
}
