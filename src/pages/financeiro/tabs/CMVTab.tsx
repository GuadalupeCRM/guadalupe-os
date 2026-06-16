import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { ArrowUpRight, ArrowDownRight, Minus, Bot } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import { SKU_LABELS } from '../../../constants/business'
import { useCMVHistory, useCreateCMVEntry, useAgentInsights } from '../../../hooks/useFinanceiro'
import type { CMVSkuSummary } from '../../../hooks/useFinanceiro'
import type { SKUType } from '../../../types'

const REASON_LABELS: Record<string, string> = {
  'compra de insumo': 'Compra de insumo',
  ajuste: 'Ajuste',
  retificacao: 'Retificação',
}

const SKU_COLORS: Record<SKUType, string> = {
  mango_sour: '#FAAE1A',
  margarita_lime: '#6BB42E',
  paloma_grapefruit: '#E21655',
}

const cmvSchema = z.object({
  cmv_value: z.coerce.number().positive('Informe um valor maior que zero'),
  reason: z.enum(['compra_insumo', 'ajuste', 'retificacao']),
  bling_nf_ref: z.string().optional(),
})

type CMVForm = z.infer<typeof cmvSchema>

const REASON_DB_LABELS: Record<CMVForm['reason'], string> = {
  compra_insumo: 'Compra de insumo',
  ajuste: 'Ajuste',
  retificacao: 'Retificação',
}

function UpdateCMVModal({ open, onClose, sku, current }: { open: boolean; onClose: () => void; sku: SKUType; current: number }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CMVForm>({
    resolver: zodResolver(cmvSchema),
    defaultValues: { cmv_value: undefined as unknown as number, reason: 'ajuste', bling_nf_ref: '' },
  })
  const createCMV = useCreateCMVEntry()

  const onSubmit = async (values: CMVForm) => {
    try {
      await createCMV.mutateAsync({
        sku,
        cmv_value: values.cmv_value,
        previous_value: current,
        reason: REASON_DB_LABELS[values.reason],
        bling_nf_ref: values.bling_nf_ref || undefined,
      })
      toast.success('CMV atualizado')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao atualizar CMV')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Atualizar CMV — ${SKU_LABELS[sku]}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <p className="font-sans text-xs text-gray-400 mb-1">Valor atual</p>
          <p className="font-serif text-xl text-gray-700">{formatCurrency(current)}</p>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Novo valor (R$)</label>
          <input type="number" step="0.01" {...register('cmv_value')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.cmv_value && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.cmv_value.message}</p>}
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Motivo</label>
          <select {...register('reason')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            <option value="compra_insumo">Compra de insumo</option>
            <option value="ajuste">Ajuste</option>
            <option value="retificacao">Retificação</option>
          </select>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">NF Bling (opcional)</label>
          <input type="text" {...register('bling_nf_ref')} placeholder="Ex: NF-2026-001045" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SkuCard({ summary, onUpdate }: { summary: CMVSkuSummary; onUpdate: () => void }) {
  const { sku, current, lastUpdated, pctChange } = summary
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{SKU_LABELS[sku]}</p>
      <p className="font-serif text-3xl text-gray-900">{formatCurrency(current)}</p>
      <p className="font-sans text-xs text-gray-400 mt-1">por lata · atualizado em {lastUpdated ? formatDate(lastUpdated) : '—'}</p>
      <div className="flex items-center gap-1.5 mt-2">
        {pctChange === null ? (
          <span className="flex items-center gap-1 text-xs font-sans text-gray-400"><Minus size={12} /> sem histórico</span>
        ) : pctChange === 0 ? (
          <span className="flex items-center gap-1 text-xs font-sans text-gray-400"><Minus size={12} /> 0,0% vs mês anterior</span>
        ) : pctChange > 0 ? (
          <span className="flex items-center gap-1 text-xs font-sans text-rosa-vivid"><ArrowUpRight size={12} /> +{pctChange.toFixed(1)}% vs mês anterior</span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-sans text-verde-vivid"><ArrowDownRight size={12} /> {pctChange.toFixed(1)}% vs mês anterior</span>
        )}
      </div>
      <button
        onClick={onUpdate}
        className="mt-4 w-full px-3 py-2 rounded-lg font-sans font-semibold text-sm bg-areia text-gray-700 hover:bg-areia-warm"
      >
        Atualizar CMV
      </button>
    </div>
  )
}

export default function CMVTab() {
  const { data, isLoading } = useCMVHistory()
  const { data: insights } = useAgentInsights()
  const [modalSku, setModalSku] = useState<SKUType | null>(null)

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando CMV...</p>
  }

  const { bySku, allHistory } = data
  const skuInsights = (insights ?? []).filter((i) => i.insight_type === 'sugestao' || i.insight_type === 'alerta')

  // Build chart data merged by month
  const monthsSet = new Set<string>()
  bySku.forEach((s) => s.chartData.forEach((c) => monthsSet.add(c.month)))
  const months = Array.from(monthsSet).sort()
  const chartData = months.map((m) => {
    const row: Record<string, string | number> = { month: m, label: bySku[0]?.chartData.find((c) => c.month === m)?.label ?? m }
    bySku.forEach((s) => {
      const point = s.chartData.find((c) => c.month === m)
      row[s.sku] = point ? point.value : NaN
    })
    return row
  })

  return (
    <div className="space-y-5">
      {/* Insight do agente */}
      {skuInsights.map((insight) => (
        <div key={insight.id} className="bg-verde-pale border border-verde-mid rounded-xl p-5 flex items-start gap-3">
          <div className="w-8 h-8 bg-verde-vivid rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bot size={14} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-sans font-semibold text-sm text-verde-vivid">{insight.title}</p>
            <p className="font-sans text-sm text-gray-600 mt-1">{insight.message}</p>
          </div>
          {insight.action_label && (
            <button
              onClick={() => toast(`Ação: ${insight.action_label}`, { icon: '🔎' })}
              className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-verde-vivid text-white hover:bg-verde-mid flex-shrink-0"
            >
              {insight.action_label}
            </button>
          )}
        </div>
      ))}

      {/* Cards por SKU */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bySku.map((s) => (
          <SkuCard key={s.sku} summary={s} onUpdate={() => setModalSku(s.sku)} />
        ))}
      </div>

      {/* Histórico chart */}
      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-3">Evolução do CMV — últimos 6 meses</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11, fill: '#9CA3AF' }} width={70} domain={['auto', 'auto']} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }} />
            <Legend
              formatter={(value) => SKU_LABELS[value as SKUType] ?? value}
              wrapperStyle={{ fontSize: 12, fontFamily: 'Barlow Condensed' }}
            />
            {bySku.map((s) => (
              <Line key={s.sku} type="monotone" dataKey={s.sku} stroke={SKU_COLORS[s.sku]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de histórico */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-sans font-semibold text-sm text-gray-700">Histórico de CMV</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5">Mês</th>
                <th className="px-5 py-2.5">SKU</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
                <th className="px-5 py-2.5 text-right">Anterior</th>
                <th className="px-5 py-2.5">Motivo</th>
                <th className="px-5 py-2.5">NF Bling</th>
              </tr>
            </thead>
            <tbody>
              {allHistory.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Nenhum histórico de CMV.</td></tr>
              ) : allHistory.map((h) => (
                <tr key={h.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-500">{formatDate(h.month)}</td>
                  <td className="px-5 py-2.5 text-gray-800">{SKU_LABELS[h.sku] ?? h.sku}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(Number(h.cmv_value))}</td>
                  <td className="px-5 py-2.5 text-right text-gray-400">{h.previous_value != null ? formatCurrency(Number(h.previous_value)) : '—'}</td>
                  <td className="px-5 py-2.5 text-gray-600">{REASON_LABELS[h.reason?.toLowerCase() ?? ''] ?? h.reason ?? '—'}</td>
                  <td className="px-5 py-2.5 text-gray-400">{h.bling_nf_ref ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalSku && (
        <UpdateCMVModal
          open
          onClose={() => setModalSku(null)}
          sku={modalSku}
          current={bySku.find((s) => s.sku === modalSku)?.current ?? 0}
        />
      )}
    </div>
  )
}
