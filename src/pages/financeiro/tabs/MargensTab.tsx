import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { AlertTriangle, Award, Pencil } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { formatCurrency, formatPercent, formatNumber } from '../../../utils/formatters'
import { CHANNEL_LABELS } from '../../../constants/business'
import { useChannelMargins, useUpdateChannelCosts, currentMonthKey } from '../../../hooks/useFinanceiro'
import type { ChannelMarginRow } from '../../../hooks/useFinanceiro'

const costsSchema = z.object({
  freight_cost: z.coerce.number().min(0),
  labor_cost: z.coerce.number().min(0),
  materials_cost: z.coerce.number().min(0),
  other_cost: z.coerce.number().min(0),
})

type CostsForm = z.infer<typeof costsSchema>

function currentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday-based week
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

function EditCostsModal({ open, onClose, row }: { open: boolean; onClose: () => void; row: ChannelMarginRow }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<CostsForm>({
    resolver: zodResolver(costsSchema),
    defaultValues: {
      freight_cost: row.freight,
      labor_cost: row.labor,
      materials_cost: row.materials,
      other_cost: row.other,
    },
  })
  const updateCosts = useUpdateChannelCosts()

  const onSubmit = async (values: CostsForm) => {
    try {
      await updateCosts.mutateAsync({ canal: row.canal, weekStart: currentWeekStart(), ...values })
      toast.success('Custos atualizados')
      onClose()
    } catch {
      toast.error('Erro ao atualizar custos')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Custos — ${CHANNEL_LABELS[row.canal] ?? row.canal}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="font-sans text-xs text-gray-400">
          Semana atual: {formatDateLabel(currentWeekStart())}. Os valores abaixo substituem os custos da semana para este canal.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Frete (R$)</label>
            <input type="number" step="0.01" {...register('freight_cost')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Mão de obra (R$)</label>
            <input type="number" step="0.01" {...register('labor_cost')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Materiais (R$)</label>
            <input type="number" step="0.01" {...register('materials_cost')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Outros (R$)</label>
            <input type="number" step="0.01" {...register('other_cost')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
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

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

const BAR_COLOR = (pct: number) => (pct < 0 ? '#E21655' : pct < 15 ? '#FAAE1A' : '#6BB42E')

export default function MargensTab() {
  const month = currentMonthKey()
  const { data, isLoading } = useChannelMargins(month)
  const [editRow, setEditRow] = useState<ChannelMarginRow | null>(null)

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando margens por canal...</p>
  }

  const { rows, mostProfitable, lossChannels } = data

  return (
    <div className="space-y-5">
      {/* Canal mais rentável */}
      {mostProfitable && (
        <div className="bg-verde-pale border border-verde-mid rounded-xl p-5 flex items-start gap-3">
          <div className="w-8 h-8 bg-verde-vivid rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Award size={14} className="text-white" />
          </div>
          <div>
            <p className="font-sans font-semibold text-sm text-verde-vivid">Canal mais rentável este mês</p>
            <p className="font-sans text-sm text-gray-600 mt-1">
              <span className="font-bold">{CHANNEL_LABELS[mostProfitable.canal] ?? mostProfitable.canal}</span> com margem
              líquida de <span className="font-bold">{formatPercent(mostProfitable.netMarginPct)}</span> ({formatCurrency(mostProfitable.netMargin)})
            </p>
          </div>
        </div>
      )}

      {/* Alerta de canais com prejuízo */}
      {lossChannels.length > 0 && (
        <div className="bg-rosa-pale border border-rosa-vivid rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-rosa-vivid flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-sans font-bold text-sm text-rosa-vivid">Canais vendendo com margem negativa</p>
            <p className="font-sans text-sm text-gray-600 mt-0.5">
              {lossChannels.map((r) => CHANNEL_LABELS[r.canal] ?? r.canal).join(', ')} — revisar custos ou precificação.
            </p>
          </div>
        </div>
      )}

      {/* Gráfico comparativo */}
      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-3">Margem Líquida (%) por Canal</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows.map((r) => ({ ...r, label: CHANNEL_LABELS[r.canal] ?? r.canal }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} width={40} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }} />
            <Bar dataKey="netMarginPct" radius={[6, 6, 0, 0]}>
              {rows.map((r) => <Cell key={r.canal} fill={BAR_COLOR(r.netMarginPct)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela detalhada */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-sans font-semibold text-sm text-gray-700">Margens por Canal — Mês Atual</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-4 py-1.5">Canal</th>
                <th className="px-4 py-1.5 text-right">Receita</th>
                <th className="px-4 py-1.5 text-right">CMV</th>
                <th className="px-4 py-1.5 text-right">Frete</th>
                <th className="px-4 py-1.5 text-right">M. Obra</th>
                <th className="px-4 py-1.5 text-right">Materiais</th>
                <th className="px-4 py-1.5 text-right">Outros</th>
                <th className="px-4 py-1.5 text-right">Margem Líquida</th>
                <th className="px-4 py-1.5 text-right">Breakeven (un.)</th>
                <th className="px-4 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-8 text-center text-gray-400">Sem dados de margem para o mês atual.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.canal} className={`border-b border-gray-50 last:border-0 ${r.netMargin < 0 ? 'bg-rosa-pale/40' : ''}`}>
                  <td className="px-4 py-1.5 text-gray-800 font-semibold">{CHANNEL_LABELS[r.canal] ?? r.canal}</td>
                  <td className="px-4 py-1.5 text-right font-semibold text-gray-800">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 py-1.5 text-right text-gray-500">{formatCurrency(r.cmv)}</td>
                  <td className="px-4 py-1.5 text-right text-gray-500">{formatCurrency(r.freight)}</td>
                  <td className="px-4 py-1.5 text-right text-gray-500">{formatCurrency(r.labor)}</td>
                  <td className="px-4 py-1.5 text-right text-gray-500">{formatCurrency(r.materials)}</td>
                  <td className="px-4 py-1.5 text-right text-gray-500">{formatCurrency(r.other)}</td>
                  <td className={`px-4 py-1.5 text-right font-semibold ${r.netMargin >= 0 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
                    {formatCurrency(r.netMargin)} <span className="text-xs text-gray-400">({formatPercent(r.netMarginPct)})</span>
                  </td>
                  <td className="px-4 py-1.5 text-right text-gray-500">{r.unitsToBreakeven > 0 ? formatNumber(r.unitsToBreakeven) : '—'}</td>
                  <td className="px-4 py-1.5">
                    <button onClick={() => setEditRow(r)} className="text-gray-400 hover:text-verde-vivid">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editRow && <EditCostsModal open onClose={() => setEditRow(null)} row={editRow} />}
    </div>
  )
}
