import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { GOAL_METRIC_OPTIONS, GOAL_METRIC_LABELS } from '../constants'
import { useMarketingGoals, useCreateGoal, useUpdateGoalActual } from '../../../hooks/useMarketing'
import { monthLabel, shiftMonth, currentMonthKey } from '../../../hooks/useFinanceiro'
import { formatNumber } from '../../../utils/formatters'
import type { MarketingGoal } from '../../../types'

function progressColor(pct: number): string {
  if (pct >= 100) return 'bg-verde-vivid'
  if (pct >= 70) return 'bg-amarelo-vivid'
  return 'bg-rosa-vivid'
}

function progressBg(pct: number): string {
  if (pct >= 100) return 'bg-verde-pale'
  if (pct >= 70) return 'bg-amarelo-pale'
  return 'bg-rosa-pale'
}

// ============================================================
// FORM — CRIAR META
// ============================================================
const goalSchema = z.object({
  metric_key: z.string().min(1, 'Selecione a métrica'),
  target_value: z.coerce.number().positive('Informe um valor maior que zero'),
  notes: z.string().optional(),
})

type GoalForm = z.infer<typeof goalSchema>

function CreateGoalModal({ open, onClose, month }: { open: boolean; onClose: () => void; month: string }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { metric_key: GOAL_METRIC_OPTIONS[0].value, target_value: undefined as unknown as number, notes: '' },
  })
  const createGoal = useCreateGoal()

  const onSubmit = async (values: GoalForm) => {
    try {
      await createGoal.mutateAsync({
        month,
        metric_key: values.metric_key,
        metric_label: GOAL_METRIC_LABELS[values.metric_key] ?? values.metric_key,
        target_value: values.target_value,
        notes: values.notes || undefined,
      })
      toast.success('Meta criada')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao criar meta')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar Meta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Métrica</label>
          <select {...register('metric_key')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {GOAL_METRIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Valor alvo</label>
          <input type="number" step="0.01" {...register('target_value')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.target_value && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.target_value.message}</p>}
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Notas (opcional)</label>
          <textarea {...register('notes')} rows={2} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Criar meta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ============================================================
// CARD DE META
// ============================================================
function GoalCard({ goal }: { goal: MarketingGoal }) {
  const [value, setValue] = useState(String(goal.actual_value))
  const updateActual = useUpdateGoalActual()

  const pct = goal.target_value > 0 ? (goal.actual_value / goal.target_value) * 100 : 0
  const clampedPct = Math.min(pct, 100)

  const handleBlur = async () => {
    const num = Number(value)
    if (isNaN(num) || num === goal.actual_value) return
    try {
      await updateActual.mutateAsync({ id: goal.id, actual_value: num })
      toast.success('Realizado atualizado')
    } catch {
      toast.error('Erro ao atualizar')
      setValue(String(goal.actual_value))
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="font-serif text-lg text-gray-900">{goal.metric_label}</p>
        <span className={`font-sans text-xs font-bold px-2 py-0.5 rounded-full ${progressBg(pct)} ${
          pct >= 100 ? 'text-verde-vivid' : pct >= 70 ? 'text-amarelo-vivid' : 'text-rosa-vivid'
        }`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      {goal.notes && <p className="font-sans text-xs text-gray-400 mb-3">{goal.notes}</p>}

      <div className="w-full h-2.5 bg-areia rounded-full overflow-hidden mb-3">
        <div className={`h-full ${progressColor(pct)} transition-all`} style={{ width: `${clampedPct}%` }} />
      </div>

      <div className="flex items-center justify-between gap-3 font-sans text-sm">
        <div>
          <span className="text-gray-400">Meta: </span>
          <span className="font-semibold text-gray-700">{formatNumber(goal.target_value)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Realizado:</span>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            className="w-24 border border-areia-warm rounded-lg px-2 py-1 font-sans text-sm text-right focus:outline-none focus:border-verde-vivid"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TAB
// ============================================================
export default function MetasTab() {
  const [month, setMonth] = useState(currentMonthKey())
  const { data: goals, isLoading } = useMarketingGoals(month)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const summary = useMemo(() => {
    const list = goals ?? []
    let cumpridas = 0, emProgresso = 0, abaixo = 0
    list.forEach((g) => {
      const pct = g.target_value > 0 ? (g.actual_value / g.target_value) * 100 : 0
      if (pct >= 100) cumpridas++
      else if (pct >= 70) emProgresso++
      else abaixo++
    })
    return { cumpridas, emProgresso, abaixo }
  }, [goals])

  return (
    <div className="space-y-5">
      {/* Seletor de mês + ação */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="text-gray-400 hover:text-gray-600">
            <ChevronLeft size={18} />
          </button>
          <p className="font-serif text-lg text-gray-900 w-28 text-center capitalize">{monthLabel(month)}</p>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="text-gray-400 hover:text-gray-600">
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid"
        >
          <Plus size={16} /> Criar meta
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-verde-pale border border-verde-mid rounded-xl p-5 flex items-center gap-3">
          <CheckCircle2 size={22} className="text-verde-vivid" />
          <div>
            <p className="font-serif text-2xl text-gray-900">{summary.cumpridas}</p>
            <p className="font-sans text-xs text-gray-500">Metas cumpridas (≥100%)</p>
          </div>
        </div>
        <div className="bg-amarelo-pale border border-amarelo-mid rounded-xl p-5 flex items-center gap-3">
          <AlertCircle size={22} className="text-amarelo-vivid" />
          <div>
            <p className="font-serif text-2xl text-gray-900">{summary.emProgresso}</p>
            <p className="font-sans text-xs text-gray-500">Em progresso (70-99%)</p>
          </div>
        </div>
        <div className="bg-rosa-pale border border-rosa-mid rounded-xl p-5 flex items-center gap-3">
          <XCircle size={22} className="text-rosa-vivid" />
          <div>
            <p className="font-serif text-2xl text-gray-900">{summary.abaixo}</p>
            <p className="font-sans text-xs text-gray-500">Abaixo da meta (&lt;70%)</p>
          </div>
        </div>
      </div>

      {/* Metas */}
      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando metas...</p>
      ) : !goals || goals.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-sans text-gray-400">Nenhuma meta cadastrada para este mês.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}

      <CreateGoalModal open={showCreateModal} onClose={() => setShowCreateModal(false)} month={month} />
    </div>
  )
}
