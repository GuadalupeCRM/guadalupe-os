import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { FileDown } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../../utils/formatters'
import { useDRE, currentMonthKey, monthLabel } from '../../../hooks/useFinanceiro'
import type { DRELines } from '../../../hooks/useFinanceiro'

function valueColor(v: number): string {
  return v >= 0 ? 'text-verde-vivid' : 'text-rosa-vivid'
}

function Sparkline({ data, dataKey }: { data: { month: string; lines: DRELines }[]; dataKey: keyof DRELines }) {
  const chartData = data.map((d) => ({ month: d.month, value: d.lines[dataKey] as number }))
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="value" stroke="#A2C96C" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function DRERow({
  label, value, pct, bold = false, history, dataKey,
}: {
  label: string
  value: number
  pct?: number
  bold?: boolean
  history: { month: string; lines: DRELines }[]
  dataKey: keyof DRELines
}) {
  return (
    <tr className={`border-b border-gray-50 last:border-0 ${bold ? 'bg-areia' : ''}`}>
      <td className={`px-4 py-1.5 font-sans ${bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{label}</td>
      <td className={`px-4 py-1.5 text-right font-sans ${bold ? 'font-bold' : ''} ${valueColor(value)}`}>
        {formatCurrency(value)}
      </td>
      <td className="px-4 py-1.5 text-right font-sans text-gray-400 text-sm">
        {pct !== undefined ? formatPercent(pct) : '—'}
      </td>
      <td className="px-4 py-1.5">
        <Sparkline data={history} dataKey={dataKey} />
      </td>
    </tr>
  )
}

export default function DRETab() {
  const [month, setMonth] = useState(currentMonthKey())
  const { data, isLoading } = useDRE(month)

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando DRE...</p>
  }

  const { current, breakeven, history } = data

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="font-sans text-sm font-semibold text-gray-500">Mês:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonthKey())}
            className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid"
          />
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
          title="Em breve"
        >
          <FileDown size={16} /> Exportar PDF (Em breve)
        </button>
      </div>

      {/* Breakeven */}
      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="font-sans font-semibold text-sm text-gray-700">Breakeven Mensal</p>
          <p className="font-sans text-sm text-gray-500">
            MC {formatCurrency(current.margemContribuicao)} / Custo Fixo {formatCurrency(breakeven.target)} — {formatPercent(breakeven.progressPct)}
          </p>
        </div>
        <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-gray-200">
          <div
            className={`h-full rounded-full transition-all ${breakeven.progressPct >= 100 ? 'bg-verde-vivid' : 'bg-amarelo-vivid'}`}
            style={{ width: `${breakeven.progressPct}%` }}
          />
        </div>
        <p className={`font-sans text-xs mt-2 ${breakeven.diff >= 0 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
          {breakeven.diff >= 0
            ? `${formatCurrency(breakeven.diff)} acima do breakeven`
            : `Faltam ${formatCurrency(Math.abs(breakeven.diff))} para o breakeven`}
        </p>
      </div>

      {/* DRE Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-1.5 border-b border-gray-100 flex items-center justify-between">
          <p className="font-sans font-semibold text-sm text-gray-700">DRE — {monthLabel(month)}</p>
          <p className="font-sans text-xs text-gray-400">Comparativo últimos 4 meses →</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-4 py-1.5">Linha</th>
                <th className="px-4 py-1.5 text-right">Valor</th>
                <th className="px-4 py-1.5 text-right">% Receita</th>
                <th className="px-4 py-1.5">Tendência</th>
              </tr>
            </thead>
            <tbody>
              <DRERow label="RECEITA BRUTA" value={current.receitaBruta} history={history} dataKey="receitaBruta" />
              <DRERow label="(-) CMV Total" value={-current.cmvTotal} history={history} dataKey="cmvTotal" />
              <DRERow label="= LUCRO BRUTO" value={current.lucroBruto} pct={current.lucroBrutoPct} bold history={history} dataKey="lucroBruto" />
              <DRERow label="(-) Custos de Canal" value={-current.custosCanal} history={history} dataKey="custosCanal" />
              <DRERow label="= MARGEM DE CONTRIBUIÇÃO" value={current.margemContribuicao} pct={current.margemContribuicaoPct} bold history={history} dataKey="margemContribuicao" />
              <DRERow label="(-) Custos Fixos" value={-current.custosFixos} history={history} dataKey="custosFixos" />
              <DRERow label="= RESULTADO OPERACIONAL" value={current.resultadoOperacional} pct={current.resultadoOperacionalPct} bold history={history} dataKey="resultadoOperacional" />
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparativo mensal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {history.map((h) => (
          <div key={h.month} className={`bg-white border rounded-xl p-4 ${h.month === month ? 'border-verde-vivid' : 'border-gray-200'}`}>
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 capitalize">{h.label}</p>
            <p className={`font-serif text-xl ${valueColor(h.lines.resultadoOperacional)}`}>
              {formatCurrency(h.lines.resultadoOperacional)}
            </p>
            <p className="font-sans text-xs text-gray-400 mt-0.5">Resultado Operacional</p>
          </div>
        ))}
      </div>
    </div>
  )
}
