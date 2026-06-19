import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { AlertTriangle, TrendingUp, Users } from 'lucide-react'
import { useMRR } from '../../../hooks/useRelatorios'

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function monthShort(ym: string) {
  const [y, m] = ym.split('-')
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[Number(m) - 1]}/${y.slice(2)}`
}

export default function MRRTab() {
  const { data, isLoading } = useMRR()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-gray-50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users size={40} className="text-gray-200 mb-4" />
        <p className="font-sans text-sm text-gray-400">
          Nenhum dado de pedidos Shopify encontrado.
        </p>
        <p className="font-sans text-xs text-gray-300 mt-1">
          O módulo MRR será populado automaticamente quando a integração Shopify estiver ativa.
        </p>
      </div>
    )
  }

  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const mrrGrowth = prev?.mrr ? ((latest.mrr - prev.mrr) / prev.mrr) * 100 : 0
  const totalChurn = data.reduce((s, d) => s + d.churnCount, 0)
  const avgRetention = Math.round(data.reduce((s, d) => s + d.retentionRate, 0) / data.length)
  const lowRetention = data.some((d) => d.retentionRate < 60)

  const chartData = data.map((d) => ({
    name: monthShort(d.month),
    MRR: d.mrr,
    Novos: d.newCustomers,
    Recorrentes: d.returningCustomers,
    Retenção: d.retentionRate,
  }))

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'MRR atual',
            value: brl(latest.mrr),
            sub: `${mrrGrowth >= 0 ? '+' : ''}${mrrGrowth.toFixed(1)}% vs mês ant.`,
            subColor: mrrGrowth >= 0 ? 'text-[#6BB42E]' : 'text-[#E21655]',
          },
          {
            label: 'Retenção média',
            value: `${avgRetention}%`,
            sub: '6 meses',
            subColor: 'text-gray-400',
          },
          {
            label: 'Novos clientes',
            value: String(latest.newCustomers),
            sub: 'este mês',
            subColor: 'text-gray-400',
          },
          {
            label: 'Churn acumulado',
            value: String(totalChurn),
            sub: '6 meses',
            subColor: totalChurn > 0 ? 'text-[#E21655]' : 'text-gray-400',
          },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="font-sans text-xs text-gray-400 mb-1">{k.label}</p>
            <p className="font-serif text-xl font-bold text-gray-800">{k.value}</p>
            <p className={`font-sans text-xs mt-0.5 ${k.subColor}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Alert */}
      {lowRetention && (
        <div className="flex items-center gap-3 bg-[#FBE4EA] border border-[#F18EA0] rounded-xl p-4">
          <AlertTriangle size={18} className="text-[#E21655] shrink-0" />
          <span className="font-sans text-sm font-semibold text-[#E21655]">
            Retenção abaixo de 60% em algum dos últimos 6 meses. Revise a estratégia de retenção.
          </span>
        </div>
      )}

      {/* MRR Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[#6BB42E]" />
          <h3 className="font-sans font-semibold text-sm text-gray-700">MRR — 6 meses</h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
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
            <Line
              type="monotone"
              dataKey="MRR"
              stroke="#6BB42E"
              strokeWidth={2}
              dot={{ r: 4, fill: '#6BB42E' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* New vs Returning */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-sans font-semibold text-sm text-gray-700 mb-4">
          Clientes novos vs recorrentes
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Barlow Condensed' }} />
            <YAxis tick={{ fontSize: 11, fontFamily: 'Barlow Condensed' }} />
            <Tooltip contentStyle={{ fontFamily: 'Barlow Condensed', fontSize: 12 }} />
            <Legend
              wrapperStyle={{ fontFamily: 'Barlow Condensed', fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="Novos"
              stroke="#FAAE1A"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="Recorrentes"
              stroke="#6BB42E"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
