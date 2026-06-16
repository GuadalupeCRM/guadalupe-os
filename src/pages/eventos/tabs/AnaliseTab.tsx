import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts'
import { Calculator, TrendingUp } from 'lucide-react'
import { EVENT_TYPE_LABELS } from '../constants'
import { useEventsAnalysis, CMV_AVERAGE } from '../../../hooks/useEventos'
import { formatCurrency, formatNumber } from '../../../utils/formatters'
import { FIXED_COSTS_MONTHLY } from '../../../constants/business'

const COLORS = ['#6BB42E', '#A2C96C', '#FAAE1A', '#FED873', '#E21655', '#F18EA0']

export default function AnaliseTab() {
  const { data, isLoading } = useEventsAnalysis()

  const [calcAttendees, setCalcAttendees] = useState('100')
  const [calcUnits, setCalcUnits] = useState('150')
  const [calcUnitPrice, setCalcUnitPrice] = useState('15')
  const [calcCosts, setCalcCosts] = useState('1500')

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando análise...</p>
  }

  const revenuePerTypeData = data.revenuePerType.map((r) => ({ ...r, label: EVENT_TYPE_LABELS[r.type] ?? r.type }))
  const avgMarginPerTypeData = data.avgMarginPerType.map((r) => ({ ...r, label: EVENT_TYPE_LABELS[r.type] ?? r.type }))

  const units = Number(calcUnits) || 0
  const unitPrice = Number(calcUnitPrice) || 0
  const costs = Number(calcCosts) || 0
  const calcRevenue = units * unitPrice
  const calcCMV = units * CMV_AVERAGE
  const calcProfit = calcRevenue - calcCMV - costs

  // Custo mínimo viável: custo do evento que zera a margem dado o produto vendido a esse preço
  const custoMinimoViavel = calcRevenue - calcCMV

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Receita por tipo de evento */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Receita por Tipo de Evento</h3>
          {revenuePerTypeData.length === 0 ? (
            <p className="font-sans text-sm text-gray-400">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenuePerTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} name="Receita">
                  {revenuePerTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Margem média por tipo */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Margem Média por Tipo</h3>
          {avgMarginPerTypeData.length === 0 ? (
            <p className="font-sans text-sm text-gray-400">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={avgMarginPerTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="avgMargin" radius={[6, 6, 0, 0]} name="Margem média">
                  {avgMarginPerTypeData.map((_, i) => (
                    <Cell key={i} fill={(_ as { avgMargin: number }).avgMargin >= 0 ? '#6BB42E' : '#E21655'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Eventos por mês */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Eventos por Mês (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.eventsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6BB42E" strokeWidth={2} dot={{ r: 3 }} name="Eventos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* UGCs por mês */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">UGCs Gerados por Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.ugcsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#E21655" strokeWidth={2} dot={{ r: 3 }} name="UGCs" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Melhores eventos */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={16} /> Melhores Eventos por Margem</h3>
        {data.bestPerformingEvents.length === 0 ? (
          <p className="font-sans text-sm text-gray-400">Sem dados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2 text-right">Receita</th>
                  <th className="px-3 py-2 text-right">Custo</th>
                  <th className="px-3 py-2 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {data.bestPerformingEvents.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-gray-800 font-semibold">{e.name}</td>
                    <td className="px-3 py-2 text-gray-500">{EVENT_TYPE_LABELS[e.event_type ?? ''] ?? e.event_type ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(e.actual_revenue ?? e.estimated_revenue ?? 0)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(e.total_cost ?? 0)}</td>
                    <td className="px-3 py-2 text-right font-bold text-verde-vivid">{formatCurrency(Number(e.net_margin ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Calculadora de margem */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-3 flex items-center gap-2"><Calculator size={16} /> Calculadora de Margem do Evento</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Presença estimada</label>
            <input type="number" value={calcAttendees} onChange={(e) => setCalcAttendees(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Latas vendidas</label>
            <input type="number" value={calcUnits} onChange={(e) => setCalcUnits(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Preço unitário (R$)</label>
            <input type="number" step="0.01" value={calcUnitPrice} onChange={(e) => setCalcUnitPrice(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Custos do evento (R$)</label>
            <input type="number" step="0.01" value={calcCosts} onChange={(e) => setCalcCosts(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-areia rounded-lg p-3">
            <p className="font-sans text-xs text-gray-400 uppercase tracking-wider font-semibold">Receita</p>
            <p className="font-serif text-xl text-gray-900">{formatCurrency(calcRevenue)}</p>
          </div>
          <div className="bg-areia rounded-lg p-3">
            <p className="font-sans text-xs text-gray-400 uppercase tracking-wider font-semibold">CMV total (méd. {formatCurrency(CMV_AVERAGE)}/lata)</p>
            <p className="font-serif text-xl text-gray-900">{formatCurrency(calcCMV)}</p>
          </div>
          <div className="bg-areia rounded-lg p-3">
            <p className="font-sans text-xs text-gray-400 uppercase tracking-wider font-semibold">Custos do evento</p>
            <p className="font-serif text-xl text-gray-900">{formatCurrency(costs)}</p>
          </div>
          <div className={`rounded-lg p-3 ${calcProfit >= 0 ? 'bg-verde-pale' : 'bg-rosa-pale'}`}>
            <p className="font-sans text-xs text-gray-500 uppercase tracking-wider font-semibold">Lucro esperado</p>
            <p className={`font-serif text-xl ${calcProfit >= 0 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>{formatCurrency(calcProfit)}</p>
          </div>
        </div>
        <div className="mt-4 bg-amarelo-pale rounded-lg p-3">
          <p className="font-sans text-xs text-gray-600 uppercase tracking-wider font-semibold">Custo mínimo viável por evento</p>
          <p className="font-serif text-xl text-gray-900">{formatCurrency(custoMinimoViavel)}</p>
          <p className="font-sans text-xs text-gray-500 mt-0.5">
            Custos do evento acima de {formatCurrency(custoMinimoViavel)} tornam o evento deficitário, considerando {formatNumber(units)} latas a {formatCurrency(unitPrice)} (CMV médio {formatCurrency(CMV_AVERAGE)}). Referência de custos fixos mensais: {formatCurrency(FIXED_COSTS_MONTHLY)}.
          </p>
        </div>
      </div>
    </div>
  )
}
