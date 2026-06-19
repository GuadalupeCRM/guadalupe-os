import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Award } from 'lucide-react'
import { useChannelMargins, monthLabel, currentMonthKey, shiftMonth } from '../../../hooks/useFinanceiro'
import { useChannelTrends } from '../../../hooks/useRelatorios'
import { CHANNEL_LABELS } from '../../../constants/business'
import { useState } from 'react'

const CANAL_COLORS: Record<string, string> = {
  evento: '#6BB42E',
  on_trade: '#FAAE1A',
  distribuidor: '#E21655',
  dtc_site: '#A2C96C',
  dtc_ml: '#FED873',
  dtc_amazon: '#F18EA0',
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const pct = (v: number) => `${v.toFixed(1)}%`

function monthShort(ym: string) {
  const [y, m] = ym.split('-')
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[Number(m) - 1]}/${y.slice(2)}`
}

export default function CanaisTab() {
  const [month, setMonth] = useState(currentMonthKey())
  const marginsQ = useChannelMargins(month)
  const trendsQ = useChannelTrends()

  const marginRows = marginsQ.data?.rows ?? []
  const totalRevenue = marginsQ.data?.totalRevenue ?? 0
  const trends = trendsQ.data ?? []

  const sorted = [...marginRows].sort((a, b) => b.netMargin - a.netMargin)
  const bestCanal = sorted[0]

  const pieData = marginRows
    .filter((m) => m.revenue > 0)
    .map((m) => ({
      name: (CHANNEL_LABELS as Record<string, string>)[m.canal] ?? m.canal,
      value: m.revenue,
      canal: m.canal,
    }))

  // Collect all unique canais across trend data
  const allCanais = [...new Set(trends.flatMap((t) => Object.keys(t).filter((k) => k !== 'month')))]

  // Chart data for 6-month trend
  const trendChart = trends.map((t) => ({
    name: monthShort(t.month as string),
    ...Object.fromEntries(
      allCanais.map((c) => [
        (CHANNEL_LABELS as Record<string, string>)[c] ?? c,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((t as any)[c] as { revenue: number } | undefined)?.revenue ?? 0,
      ]),
    ),
  }))

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-sm font-sans"
        >
          ‹
        </button>
        <span className="font-sans font-semibold text-sm w-28 text-center capitalize">
          {monthLabel(month)}
        </span>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-sm font-sans"
          disabled={month >= currentMonthKey()}
        >
          ›
        </button>
      </div>

      {/* Best canal highlight */}
      {bestCanal && (
        <div className="flex items-center gap-3 bg-[#E6F0D7] border border-[#A2C96C] rounded-xl p-4">
          <Award size={18} className="text-[#6BB42E] shrink-0" />
          <div>
            <span className="font-sans text-xs text-[#6BB42E] font-bold uppercase tracking-wide">
              Melhor canal do mês
            </span>
            <p className="font-sans font-semibold text-gray-800">
              {(CHANNEL_LABELS as Record<string, string>)[bestCanal.canal] ?? bestCanal.canal} —{' '}
              {brl(bestCanal.netMargin)} margem líquida ({pct(bestCanal.netMarginPct)})
            </p>
          </div>
        </div>
      )}

      {/* Table + Donut side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide">
            Ranking por margem líquida — {monthLabel(month)}
          </h3>
          {marginsQ.isLoading ? (
            <div className="h-32 animate-pulse bg-gray-50 rounded" />
          ) : marginRows.length === 0 ? (
            <p className="font-sans text-sm text-gray-400 text-center py-8">
              Sem dados de receita por canal neste mês.
            </p>
          ) : (
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-semibold">#</th>
                  <th className="pb-2 font-semibold">Canal</th>
                  <th className="pb-2 font-semibold text-right">Receita</th>
                  <th className="pb-2 font-semibold text-right">CMV</th>
                  <th className="pb-2 font-semibold text-right">Margem</th>
                  <th className="pb-2 font-semibold text-right">Margem %</th>
                  <th className="pb-2 font-semibold text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={row.canal} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 text-gray-400 text-xs w-6">{i + 1}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: CANAL_COLORS[row.canal] ?? '#ccc' }}
                        />
                        <span className="text-gray-700 font-semibold">
                          {(CHANNEL_LABELS as Record<string, string>)[row.canal] ?? row.canal}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-gray-600">{brl(row.revenue)}</td>
                    <td className="py-2.5 text-right text-gray-400">{brl(row.cmv)}</td>
                    <td className={`py-2.5 text-right font-bold ${row.netMargin >= 0 ? 'text-[#6BB42E]' : 'text-[#E21655]'}`}>
                      {brl(row.netMargin)}
                    </td>
                    <td className={`py-2.5 text-right text-xs ${row.netMarginPct >= 0 ? 'text-[#6BB42E]' : 'text-[#E21655]'}`}>
                      {pct(row.netMarginPct)}
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-400">
                      {totalRevenue > 0 ? pct((row.revenue / totalRevenue) * 100) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Donut */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col items-center">
          <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide self-start">
            Distribuição de receita
          </h3>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-300 font-sans text-sm">
              Sem dados
            </div>
          ) : (
            <PieChart width={200} height={200}>
              <Pie
                data={pieData}
                cx={100}
                cy={100}
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, idx) => (
                  <Cell
                    key={`${entry.canal}-${idx}`}
                    fill={CANAL_COLORS[entry.canal] ?? '#ccc'}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{ fontFamily: 'Barlow Condensed', fontSize: 12 }}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'Barlow Condensed', fontSize: 11 }}
                iconSize={8}
              />
            </PieChart>
          )}
        </div>
      </div>

      {/* 6-month trend */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide">
          Evolução de receita por canal — 6 meses
        </h3>
        {trendsQ.isLoading ? (
          <div className="h-48 animate-pulse bg-gray-50 rounded" />
        ) : trendChart.length === 0 ? (
          <p className="font-sans text-sm text-gray-400 text-center py-8">Sem dados de tendência.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendChart} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Barlow Condensed' }} />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fontFamily: 'Barlow Condensed' }}
              />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{ fontFamily: 'Barlow Condensed', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontFamily: 'Barlow Condensed', fontSize: 11 }} iconSize={8} />
              {allCanais.map((canal) => (
                <Line
                  key={canal}
                  type="monotone"
                  dataKey={(CHANNEL_LABELS as Record<string, string>)[canal] ?? canal}
                  stroke={CANAL_COLORS[canal] ?? '#999'}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
