import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts'
import { DollarSign, Eye, MousePointerClick, Percent, TrendingUp, Target } from 'lucide-react'
import { CHANNEL_LABELS } from '../../../constants/business'
import { formatCurrency, formatNumber, formatDate } from '../../../utils/formatters'
import { useAdsPerformanceSummary } from '../../../hooks/useAds'

const COLORS = ['#6BB42E', '#A2C96C', '#FAAE1A', '#FED873', '#E21655', '#F18EA0']

export default function PerformanceTab() {
  const { data: summary, isLoading, roasTarget } = useAdsPerformanceSummary()

  if (isLoading || !summary) {
    return <p className="font-sans text-sm text-gray-400">Carregando performance...</p>
  }

  const dailySpendData = summary.dailySpend.map((d) => ({ date: formatDate(d.date), spend: d.spend }))
  const cacChartData = summary.cacByChannel.map((c) => ({ name: CHANNEL_LABELS[c.channel] ?? c.channel, cac: c.cac }))

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <DollarSign size={18} className="text-verde-vivid mb-1" />
          <p className="font-serif text-xl text-gray-900">{formatCurrency(summary.totalSpent)}</p>
          <p className="font-sans text-[11px] text-gray-500">Gasto no mês</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <Eye size={18} className="text-verde-vivid mb-1" />
          <p className="font-serif text-xl text-gray-900">{formatNumber(summary.totalImpressions)}</p>
          <p className="font-sans text-[11px] text-gray-500">Impressões</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <MousePointerClick size={18} className="text-verde-vivid mb-1" />
          <p className="font-serif text-xl text-gray-900">{formatNumber(summary.totalClicks)}</p>
          <p className="font-sans text-[11px] text-gray-500">Cliques</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <Percent size={18} className="text-verde-vivid mb-1" />
          <p className="font-serif text-xl text-gray-900">{summary.avgCtr.toFixed(2)}%</p>
          <p className="font-sans text-[11px] text-gray-500">CTR médio</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <TrendingUp size={18} className="text-verde-vivid mb-1" />
          <p className="font-serif text-xl text-gray-900">{summary.avgRoas.toFixed(1)}x</p>
          <p className="font-sans text-[11px] text-gray-500">ROAS médio</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <Target size={18} className="text-verde-vivid mb-1" />
          <p className="font-serif text-xl text-gray-900">{formatCurrency(summary.avgCac)}</p>
          <p className="font-sans text-[11px] text-gray-500">CAC médio</p>
        </div>
      </div>

      {/* Performance vs target */}
      <div className={`rounded-xl p-4 flex items-center justify-between ${summary.avgRoas >= roasTarget ? 'bg-verde-pale border border-verde-mid' : 'bg-rosa-pale border border-rosa-mid'}`}>
        <div>
          <p className={`font-sans text-sm font-semibold ${summary.avgRoas >= roasTarget ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
            ROAS médio {summary.avgRoas.toFixed(1)}x {summary.avgRoas >= roasTarget ? 'acima' : 'abaixo'} da meta de {roasTarget}x
          </p>
          <p className="font-sans text-xs text-gray-500 mt-0.5">
            Referência de indústria para CPG: ROAS &gt; {roasTarget}x é considerado saudável.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ROAS por campanha */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">ROAS por Campanha</h3>
          {summary.roasByCampaign.length === 0 ? (
            <p className="font-sans text-sm text-gray-400">Sem dados de ROAS.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(summary.roasByCampaign.length * 40, 200)}>
              <BarChart data={summary.roasByCampaign} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}x`} />
                <Bar dataKey="roas" radius={[0, 6, 6, 0]} name="ROAS">
                  {summary.roasByCampaign.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CAC por canal */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">CAC por Canal</h3>
          {cacChartData.length === 0 ? (
            <p className="font-sans text-sm text-gray-400">Sem dados de CAC.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cacChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="cac" radius={[6, 6, 0, 0]} name="CAC">
                  {cacChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Daily spend */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-3">Gasto Diário (últimos 30 dias)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dailySpendData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.ceil(dailySpendData.length / 10)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="spend" stroke="#6BB42E" fill="#E6F0D7" name="Gasto" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Best/worst */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summary.best && (
          <div className="bg-verde-pale border border-verde-mid rounded-xl p-4">
            <p className="font-sans text-xs font-bold uppercase tracking-wider text-verde-vivid mb-1">Melhor Performance</p>
            <p className="font-serif text-lg text-gray-900">{summary.best.name}</p>
            <p className="font-sans text-sm text-gray-600">ROAS {summary.best.roas?.toFixed(1)}x · CAC {formatCurrency(summary.best.cac ?? 0)}</p>
          </div>
        )}
        {summary.worst && (
          <div className="bg-rosa-pale border border-rosa-mid rounded-xl p-4">
            <p className="font-sans text-xs font-bold uppercase tracking-wider text-rosa-vivid mb-1">Pior Performance</p>
            <p className="font-serif text-lg text-gray-900">{summary.worst.name}</p>
            <p className="font-sans text-sm text-gray-600">ROAS {summary.worst.roas?.toFixed(1)}x · CAC {formatCurrency(summary.worst.cac ?? 0)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
