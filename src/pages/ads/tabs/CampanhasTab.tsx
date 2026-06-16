import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plug, Plus, RefreshCw } from 'lucide-react'
import { CHANNEL_LABELS } from '../../../constants/business'
import { formatCurrency } from '../../../utils/formatters'
import { useAdCampaigns, useMetaConnectionStatus, useSyncMetaCampaigns, useUpdateCampaignStatus } from '../../../hooks/useAds'
import { CAMPAIGN_STATUS_BADGE, CAMPAIGN_STATUS_LABELS, TIER_LABELS } from '../constants'
import CampaignForm from '../components/CampaignForm'
import CampaignDetailPanel from '../components/CampaignDetailPanel'
import type { AdCampaign } from '../../../types'

export default function CampanhasTab() {
  const { data: campaigns, isLoading } = useAdCampaigns()
  const { data: connection } = useMetaConnectionStatus()
  const syncMeta = useSyncMetaCampaigns()
  const updateStatus = useUpdateCampaignStatus()

  const handleToggleStatus = async (e: React.MouseEvent, c: AdCampaign) => {
    e.stopPropagation()
    const next = c.status === 'ativa' ? 'pausada' : 'ativa'
    try {
      await updateStatus.mutateAsync({ id: c.id, status: next })
      toast.success(next === 'pausada' ? 'Campanha pausada' : 'Campanha ativada')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<AdCampaign | null>(null)

  const handleSync = async () => {
    try {
      await syncMeta.mutateAsync()
      toast.success('Campanhas sincronizadas')
    } catch {
      toast.error('Erro ao sincronizar')
    }
  }

  return (
    <div className="space-y-5">
      {/* Connection status */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${connection?.connected ? 'bg-verde-pale' : 'bg-gray-100'}`}>
            <Plug size={16} className={connection?.connected ? 'text-verde-vivid' : 'text-gray-400'} />
          </div>
          <div>
            <p className="font-sans text-sm font-semibold text-gray-700">
              Meta Ads {connection?.connected ? 'conectado' : 'não conectado'}
            </p>
            <p className="font-sans text-xs text-gray-400">
              {connection?.connected ? 'Sincronização automática de campanhas ativa' : 'Conecte sua conta para sincronizar campanhas automaticamente'}
            </p>
          </div>
        </div>
        {connection?.connected ? (
          <button onClick={handleSync} disabled={syncMeta.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-areia text-gray-600 hover:bg-areia-warm disabled:opacity-50">
            <RefreshCw size={14} className={syncMeta.isPending ? 'animate-spin' : ''} /> {syncMeta.isPending ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        ) : (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-areia text-gray-600 hover:bg-areia-warm">
            Input manual
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-gray-400">{(campaigns ?? []).length} campanhas</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid">
          <Plus size={16} /> Nova Campanha
        </button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando campanhas...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-2.5">Nome</th>
                  <th className="px-5 py-2.5">Plataforma</th>
                  <th className="px-5 py-2.5">Tier</th>
                  <th className="px-5 py-2.5 text-right">Budget</th>
                  <th className="px-5 py-2.5 text-right">Gasto</th>
                  <th className="px-5 py-2.5 text-right">Restante</th>
                  <th className="px-5 py-2.5 text-right">ROAS</th>
                  <th className="px-5 py-2.5 text-right">CAC</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(campaigns ?? []).length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">Nenhuma campanha cadastrada.</td></tr>
                ) : (campaigns ?? []).map((c) => {
                  const remaining = (c.monthly_budget ?? 0) - c.spent_to_date
                  return (
                    <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-areia/40">
                      <td className="px-5 py-2.5 text-gray-700 font-semibold">
                        {c.name}
                        {c.canal && <span className="block font-sans text-[10px] text-gray-400">{CHANNEL_LABELS[c.canal] ?? c.canal}</span>}
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">{c.platform}</td>
                      <td className="px-5 py-2.5">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-areia text-gray-600">
                          {TIER_LABELS[c.budget_tier]}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right text-gray-600">{formatCurrency(c.monthly_budget ?? 0)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-600">{formatCurrency(c.spent_to_date)}</td>
                      <td className={`px-5 py-2.5 text-right font-semibold ${remaining < 0 ? 'text-rosa-vivid' : 'text-gray-700'}`}>{formatCurrency(remaining)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-700 font-semibold">{c.roas ? `${c.roas.toFixed(1)}x` : '—'}</td>
                      <td className="px-5 py-2.5 text-right text-gray-600">{c.cac ? formatCurrency(c.cac) : '—'}</td>
                      <td className="px-5 py-2.5">
                        <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS_BADGE[c.status]}`}>
                          {CAMPAIGN_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        {(c.status === 'ativa' || c.status === 'pausada') && (
                          <button onClick={(e) => handleToggleStatus(e, c)} className="font-sans text-xs font-semibold text-gray-400 hover:text-rosa-vivid">
                            {c.status === 'ativa' ? 'Pausar' : 'Ativar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CampaignForm open={showForm} onClose={() => setShowForm(false)} />
      {selected && <CampaignDetailPanel campaign={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
