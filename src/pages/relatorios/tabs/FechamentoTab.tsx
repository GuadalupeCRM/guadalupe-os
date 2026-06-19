import { useState } from 'react'
import { CheckSquare, Square, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useDRE, monthLabel, shiftMonth, currentMonthKey } from '../../../hooks/useFinanceiro'
import {
  useMonthClosings,
  useTriggerDREAgent,
  useClosingStatus,
  useSetClosingStatus,
} from '../../../hooks/useRelatorios'
import { useAuthStore } from '../../../store/authStore'

const CHECKLIST = [
  'Conferir saldo de caixa vs extrato bancário',
  'Reconciliar NFs do Bling com receita registrada',
  'Lançar todos os custos fixos do mês',
  'Revisar sugestões de CMV do agente IA',
  'Classificar NFs sem canal (agente IA)',
  'Gerar DRE do mês via agente',
  'Revisar resultado líquido vs breakeven',
  'Aprovar fechamento',
]

const STATUS_LABELS = {
  0: { label: 'Aberto', color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
  1: { label: 'Em revisão', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  2: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${v.toFixed(1)}%`

export default function FechamentoTab() {
  const profile = useAuthStore((s) => s.profile)
  const canApprove = profile?.role === 'admin' || profile?.role === 'financeiro'

  const [month, setMonth] = useState(currentMonthKey())
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const dreQ = useDRE(month)
  const closingsQ = useMonthClosings()
  const trigger = useTriggerDREAgent()
  const setStatus = useSetClosingStatus()
  const status = useClosingStatus(month)

  const dre = dreQ.data?.current
  const { label: statusLabel, color: statusColor, icon: StatusIcon } = STATUS_LABELS[status]

  function toggleCheck(item: string) {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }))
  }

  async function handleApprove() {
    await setStatus.mutateAsync({ month, status: 2 })
  }

  async function handleGenerateDRE() {
    await trigger.mutateAsync()
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

        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-sans font-semibold ${statusColor}`}>
          <StatusIcon size={12} />
          {statusLabel}
        </span>

        <button
          onClick={handleGenerateDRE}
          disabled={trigger.isPending}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6BB42E] text-white text-sm font-sans font-semibold hover:bg-[#5a9a26] disabled:opacity-60"
        >
          <RefreshCw size={14} className={trigger.isPending ? 'animate-spin' : ''} />
          {trigger.isPending ? 'Gerando...' : 'Gerar fechamento'}
        </button>

        {canApprove && status < 2 && (
          <button
            onClick={handleApprove}
            disabled={setStatus.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E21655] text-white text-sm font-sans font-semibold hover:bg-[#c01145] disabled:opacity-60"
          >
            <CheckCircle size={14} />
            Aprovar fechamento
          </button>
        )}
      </div>

      {/* DRE Summary */}
      {dreQ.isLoading ? (
        <div className="h-32 rounded-xl bg-gray-50 animate-pulse" />
      ) : dre ? (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide">
            DRE — {monthLabel(month)}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Receita Bruta', value: brl(dre.receitaBruta) },
              { label: 'CMV', value: brl(dre.cmvTotal), dim: true },
              { label: 'Lucro Bruto', value: `${brl(dre.lucroBruto)} (${pct(dre.lucroBrutoPct)})` },
              {
                label: 'Margem Contribuição',
                value: `${brl(dre.margemContribuicao)} (${pct(dre.margemContribuicaoPct)})`,
              },
              {
                label: 'Resultado Operacional',
                value: `${brl(dre.resultadoOperacional)} (${pct(dre.resultadoOperacionalPct)})`,
                highlight: dre.resultadoOperacional >= 0,
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <span className="font-sans text-xs text-gray-400">{item.label}</span>
                <span
                  className={`font-serif text-base font-bold ${
                    item.highlight !== undefined
                      ? item.highlight
                        ? 'text-[#6BB42E]'
                        : 'text-[#E21655]'
                      : item.dim
                      ? 'text-gray-400'
                      : 'text-gray-800'
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="font-sans text-sm text-gray-400">
            Nenhum dado de receita registrado para {monthLabel(month)}.
          </p>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide">
          Checklist de fechamento
        </h3>
        <ul className="space-y-2">
          {CHECKLIST.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => toggleCheck(item)}
            >
              {checked[item] ? (
                <CheckSquare size={16} className="text-[#6BB42E] shrink-0" />
              ) : (
                <Square size={16} className="text-gray-300 group-hover:text-gray-400 shrink-0" />
              )}
              <span
                className={`font-sans text-sm ${
                  checked[item] ? 'line-through text-gray-400' : 'text-gray-700'
                }`}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-xs font-sans text-gray-400">
          {Object.values(checked).filter(Boolean).length} / {CHECKLIST.length} concluídos
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide">
          Histórico de fechamentos (últimos 12 meses)
        </h3>
        {closingsQ.isLoading ? (
          <div className="h-24 animate-pulse bg-gray-50 rounded" />
        ) : !closingsQ.data?.length ? (
          <p className="font-sans text-sm text-gray-400 text-center py-6">
            Nenhum fechamento gerado ainda. Clique em "Gerar fechamento" para iniciar.
          </p>
        ) : (
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-semibold">Período</th>
                <th className="pb-2 font-semibold">Resumo</th>
                <th className="pb-2 font-semibold">Gerado em</th>
              </tr>
            </thead>
            <tbody>
              {closingsQ.data.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 text-gray-700 font-semibold whitespace-nowrap pr-4">
                    {(c.metadata?.period as string) ?? '—'}
                  </td>
                  <td className="py-3 text-gray-600 max-w-sm truncate pr-4">{c.title}</td>
                  <td className="py-3 text-gray-400 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
