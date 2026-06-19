import { useState } from 'react'
import { TrendingUp, TrendingDown, Target, X } from 'lucide-react'
import { useDRE, monthLabel, shiftMonth, currentMonthKey } from '../../../hooks/useFinanceiro'
import {
  useMonthlyProjections,
  useSaveProjections,
  useNominalActuals,
  ProjectionRow,
} from '../../../hooks/useRelatorios'
import { useAgentInsights } from '../../../hooks/useFinanceiro'
import { BREAKEVEN_MONTHLY } from '../../../constants/business'

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v: number) => v.toLocaleString('pt-BR')

interface NomArg {
  leadsNovos: number
  conversoes: number
  eventos: number
  ugcs: number
}

interface MetricDef {
  key: string
  label: string
  format: (v: number) => string
  actual: (current: ReturnType<typeof useDRE>['data'], nom: NomArg | null | undefined) => number
}

const METRICS: MetricDef[] = [
  {
    key: 'receita_bruta',
    label: 'Receita Bruta',
    format: brl,
    actual: (d) => d?.current.receitaBruta ?? 0,
  },
  {
    key: 'cmv_total',
    label: 'CMV Total',
    format: brl,
    actual: (d) => d?.current.cmvTotal ?? 0,
  },
  {
    key: 'lucro_bruto',
    label: 'Lucro Bruto',
    format: brl,
    actual: (d) => d?.current.lucroBruto ?? 0,
  },
  {
    key: 'margem_contribuicao',
    label: 'Margem Contribuição',
    format: brl,
    actual: (d) => d?.current.margemContribuicao ?? 0,
  },
  {
    key: 'resultado_operacional',
    label: 'Resultado Operacional',
    format: brl,
    actual: (d) => d?.current.resultadoOperacional ?? 0,
  },
  {
    key: 'custos_fixos',
    label: 'Custos Fixos',
    format: brl,
    actual: (d) => d?.current.custosFixos ?? 0,
  },
  {
    key: 'leads_novos',
    label: 'Leads Novos',
    format: num,
    actual: (_d, nom) => nom?.leadsNovos ?? 0,
  },
  {
    key: 'conversoes',
    label: 'Conversões',
    format: num,
    actual: (_d, nom) => nom?.conversoes ?? 0,
  },
  {
    key: 'eventos',
    label: 'Eventos realizados',
    format: num,
    actual: (_d, nom) => nom?.eventos ?? 0,
  },
  {
    key: 'ugcs',
    label: 'UGCs gerados',
    format: num,
    actual: (_d, nom) => nom?.ugcs ?? 0,
  },
]

export default function RealizadoVsProjetadoTab() {
  const [month, setMonth] = useState(currentMonthKey())
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const dreQ = useDRE(month)
  const projQ = useMonthlyProjections(month)
  const nomQ = useNominalActuals(month)
  const insightsQ = useAgentInsights()
  const saveProj = useSaveProjections()

  const dre = dreQ.data
  const proj = projQ.data ?? {}
  const nom = nomQ.data

  const dreInsight = insightsQ.data?.find((i) => i.agent_name === 'agent-dre-generator')

  function openModal() {
    const init: Record<string, string> = {}
    for (const m of METRICS) {
      init[m.key] = String(proj[m.key] ?? '')
    }
    setDraft(init)
    setModalOpen(true)
  }

  async function saveModal() {
    const rows: ProjectionRow[] = METRICS.map((m) => ({
      metric_key: m.key,
      projected_value: parseFloat(draft[m.key] || '0') || 0,
    }))
    await saveProj.mutateAsync({ month, projections: rows })
    setModalOpen(false)
  }

  function deltaClass(actual: number, projected: number, higherIsBetter = true) {
    if (!projected) return 'text-gray-400'
    const diff = actual - projected
    const good = higherIsBetter ? diff >= 0 : diff <= 0
    return good ? 'text-[#6BB42E]' : 'text-[#E21655]'
  }

  function deltaPct(actual: number, projected: number) {
    if (!projected) return '—'
    const pct = ((actual - projected) / Math.abs(projected)) * 100
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-sm font-sans"
          >
            ‹
          </button>
          <span className="font-sans font-semibold text-sm w-28 text-center capitalize">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-sm font-sans"
            disabled={month >= currentMonthKey()}
          >
            ›
          </button>
        </div>
        <button
          onClick={openModal}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FAAE1A] text-white text-sm font-sans font-semibold hover:bg-[#e09a10]"
        >
          <Target size={14} />
          Definir projetado
        </button>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map((m) => {
          const actualVal = m.actual(dre, nom)
          const projVal = proj[m.key] ?? 0
          const isCost = ['cmv_total', 'custos_fixos'].includes(m.key)

          return (
            <div
              key={m.key}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-sans text-xs text-gray-400 font-semibold uppercase tracking-wide">
                  {m.label}
                </span>
                {projVal > 0 && (
                  <span className={`flex items-center gap-0.5 text-xs font-sans font-bold ${deltaClass(actualVal, projVal, !isCost)}`}>
                    {actualVal >= projVal ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {deltaPct(actualVal, projVal)}
                  </span>
                )}
              </div>
              <div className="font-serif text-xl font-bold text-gray-800">
                {m.format(actualVal)}
              </div>
              {projVal > 0 ? (
                <div className="mt-1 font-sans text-xs text-gray-400">
                  Meta: {m.format(projVal)}
                </div>
              ) : (
                <div className="mt-1 font-sans text-xs text-gray-300 italic">Sem meta definida</div>
              )}

              {/* Progress bar */}
              {projVal > 0 && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      deltaClass(actualVal, projVal, !isCost) === 'text-[#6BB42E]'
                        ? 'bg-[#6BB42E]'
                        : 'bg-[#E21655]'
                    }`}
                    style={{ width: `${Math.min((actualVal / projVal) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Agent insight */}
      {dreInsight && (
        <div className="bg-[#E6F0D7] rounded-xl p-5 border border-[#A2C96C]">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-sans text-xs font-bold text-[#6BB42E] uppercase tracking-wide">
              Agente DRE
            </span>
          </div>
          <p className="font-sans text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {dreInsight.message}
          </p>
          <p className="font-sans text-xs text-gray-400 mt-2">
            {new Date(dreInsight.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}

      {/* Breakeven callout */}
      <div
        className={`rounded-xl p-4 border flex items-center gap-3 ${
          (dreQ.data?.current.receitaBruta ?? 0) >= BREAKEVEN_MONTHLY
            ? 'bg-[#E6F0D7] border-[#A2C96C]'
            : 'bg-[#FBE4EA] border-[#F18EA0]'
        }`}
      >
        {(dreQ.data?.current.receitaBruta ?? 0) >= BREAKEVEN_MONTHLY ? (
          <TrendingUp className="text-[#6BB42E] shrink-0" size={18} />
        ) : (
          <TrendingDown className="text-[#E21655] shrink-0" size={18} />
        )}
        <span className="font-sans text-sm font-semibold">
          Breakeven: {brl(BREAKEVEN_MONTHLY)} —{' '}
          {(dreQ.data?.current.receitaBruta ?? 0) >= BREAKEVEN_MONTHLY
            ? `atingido com ${brl((dreQ.data?.current.receitaBruta ?? 0) - BREAKEVEN_MONTHLY)} de folga`
            : `faltam ${brl(BREAKEVEN_MONTHLY - (dreQ.data?.current.receitaBruta ?? 0))}`}
        </span>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-serif text-lg font-bold text-gray-800">
                Definir projetado — {monthLabel(month)}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {METRICS.map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <label className="font-sans text-sm text-gray-600 w-44 shrink-0">{m.label}</label>
                  <input
                    type="number"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#6BB42E]"
                    value={draft[m.key] ?? ''}
                    onChange={(e) => setDraft((p) => ({ ...p, [m.key]: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-sans text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveModal}
                disabled={saveProj.isPending}
                className="px-4 py-2 rounded-lg bg-[#6BB42E] text-white text-sm font-sans font-semibold hover:bg-[#5a9a26] disabled:opacity-60"
              >
                {saveProj.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
