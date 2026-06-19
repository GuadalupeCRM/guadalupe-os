import { Link } from 'react-router-dom'
import { Heart, ArrowRight, Trophy } from 'lucide-react'
import { useAffiliates } from '../../../hooks/useAfiliadas'
import { formatCurrency, formatNumber } from '../../../utils/formatters'

export default function AfiliadasB2CTab() {
  const { data: affiliates, isLoading } = useAffiliates()

  if (isLoading) {
    return <p className="font-sans text-sm text-gray-400">Carregando dados de afiliadas...</p>
  }

  const all = affiliates ?? []
  const allCoupons = all.flatMap((a) => a.coupons.map((c) => ({ ...c, affiliate_name: a.name })))
  const sortedByRevenue = [...all].sort((a, b) => b.total_revenue - a.total_revenue)
  const top3 = sortedByRevenue.slice(0, 3)

  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalRevenueThisChannel = all.reduce((sum, a) => sum + a.total_revenue, 0)

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rosa-pale flex items-center justify-center">
            <Heart size={18} className="text-rosa-vivid" />
          </div>
          <div>
            <p className="font-sans font-semibold text-sm text-gray-800">Canal de afiliadas</p>
            <p className="font-sans text-xs text-gray-400">Receita total gerada por cupons: {formatCurrency(totalRevenueThisChannel)}</p>
          </div>
        </div>
        <Link
          to="/afiliadas"
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm border border-areia-warm text-gray-600 hover:bg-areia"
        >
          Ver módulo completo <ArrowRight size={14} />
        </Link>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.length === 0 ? (
          <p className="font-sans text-sm text-gray-400 col-span-3">Nenhuma afiliada com vendas registradas ainda.</p>
        ) : top3.map((a, i) => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i === 0 ? 'bg-amarelo-pale' : 'bg-areia'}`}>
                <Trophy size={14} className={i === 0 ? 'text-amarelo-vivid' : 'text-gray-400'} />
              </div>
              <p className="font-sans font-semibold text-sm text-gray-800">{a.name}</p>
            </div>
            <p className="font-serif text-2xl text-gray-900">{formatCurrency(a.total_revenue)}</p>
            <p className="font-sans text-xs text-gray-400 mt-1">{formatNumber(a.total_uses)} usos de cupom</p>
          </div>
        ))}
      </div>

      {/* Tabela de cupons */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-serif text-lg text-gray-900">Performance de cupons</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5">Cupom</th>
                <th className="px-5 py-2.5">Afiliada</th>
                <th className="px-5 py-2.5 text-right">Usos</th>
                <th className="px-5 py-2.5 text-right">Unidades</th>
                <th className="px-5 py-2.5 text-right">Receita</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {allCoupons.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Nenhum cupom cadastrado.</td></tr>
              ) : allCoupons.sort((a, b) => b.revenue_generated - a.revenue_generated).map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800 font-mono font-semibold">{c.code}</td>
                  <td className="px-5 py-2.5 text-gray-600">{c.affiliate_name}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{formatNumber(c.uses)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{formatNumber(c.units_generated)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700 font-semibold">{formatCurrency(c.revenue_generated)}</td>
                  <td className="px-5 py-2.5">
                    <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.status === 'ativo' ? 'bg-verde-pale text-verde-vivid' : 'bg-gray-100 text-gray-500'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
