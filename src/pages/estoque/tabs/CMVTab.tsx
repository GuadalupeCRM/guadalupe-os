import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { ChevronDown, ChevronUp, Bot } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { SKU_LABELS } from '../../../constants/business'
import { CMV_REASON_OPTIONS, REASON_DB_LABELS, REASON_LABELS } from '../constants'
import { useCMVHistory, useCreateCMVEntry, useAgentInsights } from '../../../hooks/useFinanceiro'
import { monthLabel, shiftMonth, currentMonthKey } from '../../../hooks/useFinanceiro'
import { useCMVComponents, useUpdateCMVComponent, SKUS } from '../../../hooks/useEstoque'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import type { SKUType } from '../../../types'

const SKU_COLORS: Record<SKUType, string> = {
  mango_sour: '#FAAE1A',
  margarita_lime: '#6BB42E',
  paloma_grapefruit: '#E21655',
}

const cmvSchema = z.object({
  sku: z.enum(['mango_sour', 'margarita_lime', 'paloma_grapefruit']),
  cmv_value: z.coerce.number().positive('Informe um valor maior que zero'),
  reason: z.enum(['compra_insumo', 'ajuste', 'retificacao']),
  bling_nf_ref: z.string().optional(),
})

type CMVForm = z.infer<typeof cmvSchema>

function UpdateCMVModal({ open, onClose, currentBySku }: { open: boolean; onClose: () => void; currentBySku: Record<SKUType, number> }) {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CMVForm>({
    resolver: zodResolver(cmvSchema),
    defaultValues: { sku: 'mango_sour', cmv_value: undefined as unknown as number, reason: 'ajuste', bling_nf_ref: '' },
  })
  const createCMV = useCreateCMVEntry()
  const selectedSku = watch('sku')

  const onSubmit = async (values: CMVForm) => {
    try {
      await createCMV.mutateAsync({
        sku: values.sku,
        cmv_value: values.cmv_value,
        previous_value: currentBySku[values.sku],
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
    <Modal open={open} onClose={onClose} title="Atualizar CMV">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">SKU</label>
          <select {...register('sku')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {SKUS.map((sku) => <option key={sku} value={sku}>{SKU_LABELS[sku]}</option>)}
          </select>
          <p className="font-sans text-xs text-gray-400 mt-1">Valor atual: {formatCurrency(currentBySku[selectedSku] ?? 0)}</p>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Novo valor (R$)</label>
          <input type="number" step="0.01" {...register('cmv_value')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.cmv_value && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.cmv_value.message}</p>}
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Motivo</label>
          <select {...register('reason')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {CMV_REASON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">NF Bling (opcional)</label>
          <input type="text" {...register('bling_nf_ref')} placeholder="Ex: NF-2026-001045" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ComponentRow({ id, label, value }: { id: string; label: string; value: number }) {
  const [local, setLocal] = useState(String(value))
  const updateComponent = useUpdateCMVComponent()

  const handleBlur = async () => {
    const num = Number(local)
    if (isNaN(num) || num === value) return
    try {
      await updateComponent.mutateAsync({ id, value: num })
      toast.success('Componente atualizado')
    } catch {
      toast.error('Erro ao atualizar componente')
      setLocal(String(value))
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="font-sans text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <span className="font-sans text-xs text-gray-400">R$</span>
        <input
          type="number"
          step="0.01"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={handleBlur}
          className="w-24 border border-areia-warm rounded-lg px-2 py-1 font-sans text-sm text-right focus:outline-none focus:border-verde-vivid"
        />
      </div>
    </div>
  )
}

function CMVCompositionSection({ sku, cmv }: { sku: SKUType; cmv: number }) {
  const [open, setOpen] = useState(false)
  const { data: components } = useCMVComponents()

  const skuComponents = (components ?? []).filter((c) => c.sku === sku)
  const total = skuComponents.reduce((s, c) => s + Number(c.value), 0)

  return (
    <div className="border-t border-areia-warm pt-3 mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full font-sans text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Composição do CMV
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="mt-2">
          {skuComponents.length === 0 ? (
            <p className="font-sans text-sm text-gray-400">Sem componentes cadastrados.</p>
          ) : (
            <div className="divide-y divide-areia-warm">
              {skuComponents.map((c) => <ComponentRow key={c.id} id={c.id} label={c.label} value={Number(c.value)} />)}
            </div>
          )}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-areia-warm font-sans text-sm">
            <span className="font-semibold text-gray-700">Total componentes</span>
            <span className={`font-bold ${Math.abs(total - cmv) < 0.01 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>{formatCurrency(total)}</span>
          </div>
          {Math.abs(total - cmv) >= 0.01 && (
            <p className="font-sans text-xs text-rosa-vivid mt-1">Soma dos componentes diverge do CMV registrado ({formatCurrency(cmv)}).</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function CMVTab() {
  const { data, isLoading } = useCMVHistory()
  const { data: insights } = useAgentInsights()
  const [showModal, setShowModal] = useState(false)

  const cmvInsights = useMemo(
    () => (insights ?? []).filter((i) => (i.insight_type === 'sugestao' || i.insight_type === 'alerta') && i.title.toLowerCase().includes('cmv')),
    [insights]
  )

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando CMV...</p>
  }

  const { bySku, allHistory } = data
  const currentBySku = Object.fromEntries(bySku.map((s) => [s.sku, s.current])) as Record<SKUType, number>

  // Chart data — últimos 12 meses
  const months: string[] = []
  let cursor = currentMonthKey()
  for (let i = 0; i < 12; i++) {
    months.unshift(cursor)
    cursor = shiftMonth(cursor, -1)
  }
  const chartData = months.map((m) => {
    const row: Record<string, string | number> = { month: m, label: monthLabel(m) }
    SKUS.forEach((sku) => {
      const entry = allHistory.find((h) => h.sku === sku && h.month.slice(0, 7) === m)
      row[sku] = entry ? Number(entry.cmv_value) : NaN
    })
    return row
  })

  return (
    <div className="space-y-5">
      {/* Insights do agente */}
      {cmvInsights.map((insight) => (
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
              onClick={() => setShowModal(true)}
              className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-verde-vivid text-white hover:bg-verde-mid flex-shrink-0"
            >
              {insight.action_label}
            </button>
          )}
        </div>
      ))}

      {/* Botão atualizar */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid"
        >
          Atualizar CMV
        </button>
      </div>

      {/* Cards por SKU */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bySku.map((s) => (
          <div key={s.sku} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{SKU_LABELS[s.sku]}</p>
            <p className="font-serif text-4xl text-gray-900">{formatCurrency(s.current)}</p>
            <p className="font-sans text-xs text-gray-400 mt-1">por lata · atualizado em {s.lastUpdated ? formatDate(s.lastUpdated) : '—'}</p>
            <CMVCompositionSection sku={s.sku} cmv={s.current} />
          </div>
        ))}
      </div>

      {/* Histórico chart */}
      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-3">Evolução do CMV — últimos 12 meses</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11, fill: '#9CA3AF' }} width={70} domain={['auto', 'auto']} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }} />
            <Legend
              formatter={(value) => SKU_LABELS[value as SKUType] ?? value}
              wrapperStyle={{ fontSize: 12, fontFamily: 'Barlow Condensed' }}
            />
            {SKUS.map((sku) => (
              <Line key={sku} type="monotone" dataKey={sku} stroke={SKU_COLORS[sku]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de histórico */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-sans font-semibold text-sm text-gray-700">Histórico de Atualizações</p>
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

      <UpdateCMVModal open={showModal} onClose={() => setShowModal(false)} currentBySku={currentBySku} />
    </div>
  )
}
