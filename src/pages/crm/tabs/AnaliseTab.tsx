import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts'
import { TrendingUp, Target, Clock } from 'lucide-react'
import { formatPercent, formatNumber } from '../../../utils/formatters'
import { useCRMAnalysis } from '../../../hooks/useCRM'

const COLORS = ['#6BB42E', '#A2C96C', '#FAAE1A', '#FED873', '#E21655', '#F18EA0']

export default function AnaliseTab() {
  const { data, isLoading } = useCRMAnalysis()

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando análise...</p>
  }

  return (
    <div className="space-y-5">
      {/* Card breakeven */}
      <div className="bg-verde-vivid rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Target size={22} className="text-white" />
        </div>
        <div>
          <p className="font-sans text-xs text-white/80 uppercase tracking-wider font-semibold">Meta de leads</p>
          <p className="font-serif text-xl text-white">
            Precisamos de {data.leadsNeededForBreakeven} novos leads para fazer breakeven este mês
          </p>
          <p className="font-sans text-xs text-white/70 mt-0.5">Referência: taxa de conversão PAP de {formatPercent(18)}</p>
        </div>
      </div>

      {/* Funil */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={16} /> Funil de Vendas</h3>
        <ResponsiveContainer width="100%" height={Math.max(220, data.funnel.length * 45)}>
          <BarChart data={data.funnel} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={140} />
            <Tooltip />
            <Bar dataKey="count" fill="#6BB42E" radius={[0, 6, 6, 0]} name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Conversão estágio a estágio */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-3">Conversão entre Estágios</h3>
        <div className="space-y-2">
          {data.conversionByStage.map((c, i) => (
            <div key={i} className="flex items-center justify-between font-sans text-sm">
              <span className="text-gray-600">{c.from} → {c.to}</span>
              <span className="font-bold text-gray-800">{formatPercent(c.pct)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Conversão por canal */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Conversão por Canal</h3>
          <div className="space-y-2">
            {data.conversionByCanal.length === 0 ? (
              <p className="font-sans text-sm text-gray-400">Sem dados.</p>
            ) : data.conversionByCanal.map((c) => (
              <div key={c.canal} className="flex items-center justify-between font-sans text-sm">
                <span className="text-gray-600 capitalize">{c.canal.replace(/_/g, ' ')}</span>
                <span className="text-gray-400">{c.convertidos}/{c.total}</span>
                <span className="font-bold text-gray-800">{formatPercent(c.pct)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversão por origem */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Conversão por Origem</h3>
          <div className="space-y-2">
            {data.conversionByOrigin.length === 0 ? (
              <p className="font-sans text-sm text-gray-400">Sem dados.</p>
            ) : data.conversionByOrigin.map((c) => (
              <div key={c.origin} className="flex items-center justify-between font-sans text-sm">
                <span className="text-gray-600">{c.origin}</span>
                <span className="text-gray-400">{c.convertidos}/{c.total}</span>
                <span className="font-bold text-gray-800">{formatPercent(c.pct)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tempo médio de fechamento */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-areia flex items-center justify-center flex-shrink-0">
          <Clock size={20} className="text-gray-500" />
        </div>
        <div>
          <p className="font-sans text-xs text-gray-400 uppercase tracking-wider font-semibold">Tempo médio até fechamento</p>
          <p className="font-serif text-2xl text-gray-900">
            {data.avgTimeToCloseDays !== null ? `${formatNumber(Math.round(data.avgTimeToCloseDays))} dias` : 'Sem dados'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Leads por semana */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Leads Adicionados (últimas 8 semanas)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.leadsPerWeek}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#E21655" strokeWidth={2} dot={{ r: 3 }} name="Leads" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Leads por responsável */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Leads por Responsável</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.leadsByAssignee}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Leads">
                {data.leadsByAssignee.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
