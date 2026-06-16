import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AlertTriangle, Settings2 } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { formatCurrency, formatPercent } from '../../../utils/formatters'
import { useAuth } from '../../../hooks/useAuth'
import { useAdCampaigns, useAdsBudgetSettings, useSetAdsBudgetTiers, useSetAdsBudgetTotal } from '../../../hooks/useAds'
import { TIER_DESCRIPTIONS, TIER_LABELS, TIER_ORDER, spendColorClasses } from '../constants'
import type { AdBudgetTier } from '../../../types'

function RedistributeModal({ open, onClose, currentTiers }: { open: boolean; onClose: () => void; currentTiers: Record<AdBudgetTier, number> }) {
  const [values, setValues] = useState(currentTiers)
  const setTiers = useSetAdsBudgetTiers()

  useEffect(() => {
    if (open) setValues(currentTiers)
  }, [open, currentTiers])

  const total = TIER_ORDER.reduce((sum, t) => sum + (Number(values[t]) || 0), 0)

  const handleSave = async () => {
    if (total !== 100) {
      toast.error('A soma dos percentuais deve ser 100%')
      return
    }
    try {
      await setTiers.mutateAsync(values)
      toast.success('Budget redistribuído')
      onClose()
    } catch {
      toast.error('Erro ao redistribuir budget')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Redistribuir Budget">
      <div className="space-y-4">
        {TIER_ORDER.map((tier) => (
          <div key={tier}>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">{TIER_LABELS[tier]} (%)</label>
            <input
              type="number"
              value={values[tier]}
              onChange={(e) => setValues((v) => ({ ...v, [tier]: Number(e.target.value) }))}
              className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid"
            />
          </div>
        ))}
        <p className={`font-sans text-xs ${total === 100 ? 'text-gray-400' : 'text-rosa-vivid font-semibold'}`}>
          Total: {total}% {total !== 100 && '(deve somar 100%)'}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={setTiers.isPending} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function TierCard({ tier, budget, spent }: { tier: AdBudgetTier; budget: number; spent: number }) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0
  const remaining = budget - spent
  const remainingPct = budget > 0 ? (remaining / budget) * 100 : 0
  const colors = spendColorClasses(pct)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400">{TIER_LABELS[tier]}</p>
        <p className={`font-sans text-xs font-bold ${colors.text}`}>{pct.toFixed(0)}% consumido</p>
      </div>
      <p className="font-sans text-[11px] text-gray-400 mb-3">{TIER_DESCRIPTIONS[tier]}</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="font-serif text-xl text-gray-900">{formatCurrency(budget)}</p>
          <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Budget</p>
        </div>
        <div>
          <p className="font-serif text-xl text-gray-900">{formatCurrency(spent)}</p>
          <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Gasto</p>
        </div>
        <div>
          <p className={`font-serif text-xl ${colors.text}`}>{formatCurrency(remaining)}</p>
          <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Restante</p>
        </div>
      </div>

      <div className="w-full h-2 bg-areia rounded-full overflow-hidden">
        <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>

      {remainingPct < 10 && (
        <p className="font-sans text-[11px] text-rosa-vivid font-semibold mt-2">
          Apenas {formatPercent(remainingPct)} de budget restante
        </p>
      )}
    </div>
  )
}

export default function BudgetTab() {
  const { profile } = useAuth()
  const { data: settings, isLoading: loadingSettings } = useAdsBudgetSettings()
  const { data: campaigns, isLoading: loadingCampaigns } = useAdCampaigns()
  const setTotal = useSetAdsBudgetTotal()
  const [editingTotal, setEditingTotal] = useState(false)
  const [totalInput, setTotalInput] = useState('')
  const [showRedistribute, setShowRedistribute] = useState(false)

  const canEdit = profile?.role === 'admin' || profile?.role === 'marketing'

  const tierData = useMemo(() => {
    if (!settings) return null
    return TIER_ORDER.map((tier) => {
      const budget = settings.total * (settings.tiers[tier] / 100)
      const spent = (campaigns ?? []).filter((c) => c.budget_tier === tier).reduce((sum, c) => sum + c.spent_to_date, 0)
      return { tier, budget, spent }
    })
  }, [settings, campaigns])

  const chartData = useMemo(() => {
    if (!tierData) return []
    return tierData.map((t) => ({
      name: TIER_LABELS[t.tier],
      Gasto: t.spent,
      Restante: Math.max(t.budget - t.spent, 0),
    }))
  }, [tierData])

  const alerts = useMemo(() => {
    if (!tierData) return []
    return tierData.filter((t) => t.budget > 0 && (t.budget - t.spent) / t.budget < 0.1)
  }, [tierData])

  const handleSaveTotal = async () => {
    const value = Number(totalInput)
    if (!value || value <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    try {
      await setTotal.mutateAsync(value)
      toast.success('Budget mensal atualizado')
      setEditingTotal(false)
    } catch {
      toast.error('Erro ao atualizar budget')
    }
  }

  if (loadingSettings || loadingCampaigns || !settings || !tierData) {
    return <p className="font-sans text-sm text-gray-400">Carregando budget...</p>
  }

  return (
    <div className="space-y-5">
      {/* Budget total */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Budget Mensal de Ads</p>
          {editingTotal ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={settings.total}
                onChange={(e) => setTotalInput(e.target.value)}
                className="border border-areia-warm rounded-lg px-3 py-2 font-serif text-xl w-40 focus:outline-none focus:border-verde-vivid"
                autoFocus
              />
              <button onClick={handleSaveTotal} disabled={setTotal.isPending} className="px-3 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
                Salvar
              </button>
              <button onClick={() => setEditingTotal(false)} className="px-3 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          ) : (
            <p className="font-serif text-3xl text-gray-900">{formatCurrency(settings.total)}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && !editingTotal && (
            <button onClick={() => { setTotalInput(String(settings.total)); setEditingTotal(true) }} className="px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-areia text-gray-600 hover:bg-areia-warm">
              Editar
            </button>
          )}
          {canEdit && (
            <button onClick={() => setShowRedistribute(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid">
              <Settings2 size={14} /> Redistribuir budget
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.map((a) => (
        <div key={a.tier} className="bg-rosa-pale border border-rosa-mid rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rosa-vivid flex-shrink-0 mt-0.5" />
          <p className="font-sans text-sm text-rosa-vivid font-semibold">
            Budget {TIER_LABELS[a.tier]} abaixo de 10%. Revisar campanhas antes de nova recarga.
          </p>
        </div>
      ))}

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tierData.map((t) => (
          <TierCard key={t.tier} tier={t.tier} budget={t.budget} spent={t.spent} />
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-3">Distribuição do Budget — Gasto vs Restante</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="Gasto" stackId="a" fill="#E21655" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Restante" stackId="a" fill="#A2C96C" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <RedistributeModal open={showRedistribute} onClose={() => setShowRedistribute(false)} currentTiers={settings.tiers} />
    </div>
  )
}
