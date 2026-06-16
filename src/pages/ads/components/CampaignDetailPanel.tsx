import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { X } from 'lucide-react'
import { CHANNEL_LABELS } from '../../../constants/business'
import { formatCurrency, formatDate, formatNumber } from '../../../utils/formatters'
import { useAdDailyPerformance } from '../../../hooks/useAds'
import { CAMPAIGN_STATUS_BADGE, CAMPAIGN_STATUS_LABELS, TIER_LABELS } from '../constants'
import type { AdCampaign } from '../../../types'

export default function CampaignDetailPanel({ campaign, onClose }: { campaign: AdCampaign; onClose: () => void }) {
  const { data: daily, isLoading } = useAdDailyPerformance(campaign.id)

  const chartData = useMemo(() => {
    return (daily ?? []).map((d) => ({
      date: formatDate(d.date),
      spend: Number(d.spend),
      clicks: d.clicks,
    }))
  }, [daily])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-serif text-lg text-gray-900">{campaign.name}</h3>
            <p className="font-sans text-xs text-gray-400">{campaign.platform} {campaign.canal && `· ${CHANNEL_LABELS[campaign.canal] ?? campaign.canal}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-areia text-gray-600">
              Tier {TIER_LABELS[campaign.budget_tier]}
            </span>
            <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS_BADGE[campaign.status]}`}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div>
              <p className="font-serif text-lg text-gray-900">{formatCurrency(campaign.monthly_budget ?? 0)}</p>
              <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Budget</p>
            </div>
            <div>
              <p className="font-serif text-lg text-gray-900">{formatCurrency(campaign.spent_to_date)}</p>
              <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Gasto</p>
            </div>
            <div>
              <p className="font-serif text-lg text-gray-900">{formatNumber(campaign.impressions)}</p>
              <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Impressões</p>
            </div>
            <div>
              <p className="font-serif text-lg text-gray-900">{formatNumber(campaign.clicks)}</p>
              <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Cliques</p>
            </div>
            <div>
              <p className="font-serif text-lg text-verde-vivid">{(campaign.roas ?? 0).toFixed(1)}x</p>
              <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">ROAS</p>
            </div>
            <div>
              <p className="font-serif text-lg text-gray-900">{formatCurrency(campaign.cac ?? 0)}</p>
              <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">CAC</p>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-base text-gray-900 mb-2">Performance Diária</h4>
            {isLoading ? (
              <p className="font-sans text-sm text-gray-400">Carregando...</p>
            ) : chartData.length === 0 ? (
              <p className="font-sans text-sm text-gray-400">Sem dados de performance.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.ceil(chartData.length / 10)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="spend" stroke="#E21655" fill="#FBE4EA" name="Gasto" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
