import { useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, AlertCircle, Settings2 } from 'lucide-react'
import { SKU_LABELS } from '../../../constants/business'
import { useReorderSuggestions, useUpdateReorderPoint, SKUS } from '../../../hooks/useEstoque'
import { formatCurrency, formatNumber } from '../../../utils/formatters'
import type { ReorderSuggestion } from '../../../hooks/useEstoque'

function SuggestionTable({ rows, emptyMessage }: { rows: ReorderSuggestion[]; emptyMessage: string }) {
  if (rows.length === 0) {
    return <p className="font-sans text-sm text-gray-400 px-5 py-4">{emptyMessage}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-sans text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
            <th className="px-5 py-2.5">SKU</th>
            <th className="px-5 py-2.5 text-right">Estoque atual</th>
            <th className="px-5 py-2.5 text-right">Ponto de reposição</th>
            <th className="px-5 py-2.5 text-right">Consumo médio/dia (30d)</th>
            <th className="px-5 py-2.5 text-right">Repor sugerido</th>
            <th className="px-5 py-2.5 text-right">Custo estimado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sku} className="border-b border-gray-50 last:border-0">
              <td className="px-5 py-2.5 text-gray-800 font-semibold">{SKU_LABELS[r.sku]}</td>
              <td className="px-5 py-2.5 text-right text-gray-700">{formatNumber(r.currentStock)}</td>
              <td className="px-5 py-2.5 text-right text-gray-700">{formatNumber(r.reorderPoint)}</td>
              <td className="px-5 py-2.5 text-right text-gray-700">{r.avgDailyConsumption.toFixed(1)}</td>
              <td className="px-5 py-2.5 text-right font-bold text-gray-900">{formatNumber(r.suggestedUnits)}</td>
              <td className="px-5 py-2.5 text-right font-bold text-gray-900">{formatCurrency(r.estimatedCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReorderPointSettings({ rows }: { rows: ReorderSuggestion[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(SKUS.map((sku) => [sku, String(rows.find((r) => r.sku === sku)?.reorderPoint ?? '')]))
  )
  const updateReorderPoint = useUpdateReorderPoint()

  const handleSave = async (sku: (typeof SKUS)[number]) => {
    const num = Number(values[sku])
    if (isNaN(num) || num < 0) {
      toast.error('Informe um valor válido')
      return
    }
    try {
      await updateReorderPoint.mutateAsync({ sku, reorder_point: num })
      toast.success('Ponto de reposição atualizado')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-serif text-lg text-gray-900 mb-3 flex items-center gap-2"><Settings2 size={16} /> Pontos de Reposição</h3>
      <div className="space-y-3">
        {SKUS.map((sku) => (
          <div key={sku} className="flex items-center justify-between gap-3">
            <span className="font-sans text-sm text-gray-700 flex-1">{SKU_LABELS[sku]}</span>
            <input
              type="number"
              value={values[sku]}
              onChange={(e) => setValues((v) => ({ ...v, [sku]: e.target.value }))}
              className="w-28 border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-sm text-right focus:outline-none focus:border-verde-vivid"
            />
            <button
              onClick={() => handleSave(sku)}
              className="px-3 py-1.5 rounded-lg font-sans font-semibold text-xs bg-verde-vivid text-white hover:bg-verde-mid"
            >
              Salvar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AlertasTab() {
  const { data: suggestions, isLoading } = useReorderSuggestions()

  if (isLoading || !suggestions) {
    return <p className="font-sans text-sm text-gray-400">Carregando alertas...</p>
  }

  const below = suggestions.filter((s) => s.status === 'below')
  const approaching = suggestions.filter((s) => s.status === 'approaching')

  return (
    <div className="space-y-5">
      {/* Abaixo do ponto de reposição */}
      <div className="bg-rosa-pale border border-rosa-mid rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-rosa-mid/40 flex items-center gap-2">
          <AlertTriangle size={16} className="text-rosa-vivid" />
          <h3 className="font-serif text-lg text-gray-900">Abaixo do Ponto de Reposição</h3>
        </div>
        <SuggestionTable rows={below} emptyMessage="Nenhum SKU abaixo do ponto de reposição." />
      </div>

      {/* Se aproximando do ponto de reposição */}
      <div className="bg-amarelo-pale border border-amarelo-mid rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-amarelo-mid/40 flex items-center gap-2">
          <AlertCircle size={16} className="text-amarelo-vivid" />
          <h3 className="font-serif text-lg text-gray-900">Se Aproximando do Ponto de Reposição</h3>
        </div>
        <SuggestionTable rows={approaching} emptyMessage="Nenhum SKU se aproximando do ponto de reposição." />
      </div>

      {/* Cálculo de reposição necessária */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-3">Calcular Reposição Necessária</h3>
        <p className="font-sans text-xs text-gray-400 mb-3">
          Sugestão = consumo médio dos últimos 30 dias × 60 dias de buffer (2 meses).
        </p>
        <SuggestionTable rows={suggestions} emptyMessage="Sem dados de consumo." />
      </div>

      <ReorderPointSettings rows={suggestions} />
    </div>
  )
}
