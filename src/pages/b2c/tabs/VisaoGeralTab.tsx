import { TrendingUp, TrendingDown, Users, Package, RefreshCcw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useB2COverview, useChannelRevenueComparison } from '../../../hooks/useB2C'
import { useEmailCampaigns, useSubscriberStats } from '../../../hooks/useMarketing'
import { SKU_LABELS, CHANNEL_LABELS } from '../../../constants/business'
import { formatCurrency, formatPercent, formatNumber } from '../../../utils/formatters'

function KPICard({ icon: Icon, label, value, sub, alert }: { icon: typeof TrendingUp; label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`bg-white border rounded-xl p-5 ${alert ? 'border-rosa-vivid' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${alert ? 'bg-rosa-pale' : 'bg-verde-pale'}`}>
          <Icon size={14} className={alert ? 'text-rosa-vivid' : 'text-verde-vivid'} />
        </div>
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className="font-serif text-3xl text-gray-900">{value}</p>
      {sub && <p className={`font-sans text-xs mt-1 ${alert ? 'text-rosa-vivid' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}

export default function VisaoGeralTab() {
  const { data: overview, isLoading } = useB2COverview()
  const { data: channelData } = useChannelRevenueComparison()
  const { data: campaigns } = useEmailCampaigns()
  const { data: subscriberStats } = useSubscriberStats()

  const latestStats = subscriberStats && subscriberStats.length > 0 ? subscriberStats[subscriberStats.length - 1] : null
  const totalSubscribers = latestStats?.total_subscribers ?? 0
  const totalOpens = (campaigns ?? []).reduce((sum, c) => sum + (c.open_rate ? Math.round((c.sent_count * c.open_rate) / 100) : 0), 0)
  const totalClicks = (campaigns ?? []).reduce((sum, c) => sum + (c.click_rate ? Math.round((c.sent_count * c.click_rate) / 100) : 0), 0)
  const totalOrdersFromEmail = overview?.ordersThisMonth ?? 0

  const channelComparison = (() => {
    const byChannel = new Map<string, number>()
    for (const row of channelData ?? []) {
      byChannel.set(row.canal, (byChannel.get(row.canal) ?? 0) + Number(row.revenue ?? 0))
    }
    return Array.from(byChannel.entries())
      .map(([canal, revenue]) => ({ canal: CHANNEL_LABELS[canal] ?? canal, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
  })()

  if (isLoading) {
    return <p className="font-sans text-sm text-gray-400">Carregando visão geral B2C...</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={overview?.mrrDropped ? TrendingDown : TrendingUp}
          label="Receita recorrente (MRR)"
          value={formatCurrency(overview?.mrr ?? 0)}
          sub={overview?.mrrDropped ? `Caiu vs. mês anterior (${formatCurrency(overview?.mrrPrevMonth ?? 0)})` : 'Vendas de clientes recorrentes'}
          alert={overview?.mrrDropped}
        />
        <KPICard
          icon={RefreshCcw}
          label="Taxa de retenção"
          value={overview?.retentionRate != null ? formatPercent(overview.retentionRate) : '—'}
          sub="Compraram em M-1 e voltaram em M"
        />
        <KPICard icon={Package} label="Ticket médio (AOV)" value={formatCurrency(overview?.aov ?? 0)} sub="Mês atual" />
        <KPICard icon={Users} label="Pedidos no mês" value={formatNumber(overview?.ordersThisMonth ?? 0)} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-serif text-lg text-gray-900">Top SKUs no site</p>
        </div>
        <div className="divide-y divide-gray-50">
          {!overview?.topSkus || overview.topSkus.length === 0 ? (
            <p className="font-sans text-sm text-gray-400 px-5 py-6">Sem vendas registradas ainda.</p>
          ) : overview.topSkus.map((s) => (
            <div key={s.sku} className="px-5 py-3 flex items-center justify-between">
              <p className="font-sans text-sm font-semibold text-gray-800">{SKU_LABELS[s.sku] ?? s.sku}</p>
              <p className="font-sans text-sm text-gray-600">{formatNumber(s.units)} unidades</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-4">Funil de conversão (Email)</p>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: 'Inscritos', value: totalSubscribers },
            { label: 'Aberturas', value: totalOpens },
            { label: 'Cliques', value: totalClicks },
            { label: 'Pedidos', value: totalOrdersFromEmail },
          ].map((step) => (
            <div key={step.label} className="bg-white rounded-lg p-3">
              <p className="font-serif text-2xl text-gray-900">{formatNumber(step.value)}</p>
              <p className="font-sans text-xs text-gray-400 mt-1">{step.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-4">Receita B2C vs. outros canais (últimas semanas)</p>
        {channelComparison.length === 0 ? (
          <p className="font-sans text-sm text-gray-400">Sem dados de canal suficientes ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={channelComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
              <XAxis dataKey="canal" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={70} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }} />
              <Bar dataKey="revenue" name="Receita" fill="#E21655" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
