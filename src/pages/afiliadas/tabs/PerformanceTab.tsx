import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts'
import { Users, DollarSign, TrendingUp, Image } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatters'
import { useAffiliates } from '../../../hooks/useAfiliadas'

const COLORS = ['#6BB42E', '#A2C96C', '#FAAE1A', '#FED873', '#E21655', '#F18EA0']

export default function PerformanceTab() {
  const { data: affiliates, isLoading } = useAffiliates()

  const ranked = useMemo(() => {
    return [...(affiliates ?? [])]
      .filter((a) => a.roi_pct !== null)
      .sort((a, b) => (b.roi_pct ?? 0) - (a.roi_pct ?? 0))
  }, [affiliates])

  const revenueData = useMemo(() => {
    return [...(affiliates ?? [])]
      .filter((a) => a.total_revenue > 0)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .map((a) => ({ name: a.name, revenue: a.total_revenue }))
  }, [affiliates])

  const scatterData = useMemo(() => {
    return (affiliates ?? [])
      .filter((a) => a.engagement_rate && a.total_uses > 0 && a.instagram_followers)
      .map((a) => ({
        name: a.name,
        engagement: a.engagement_rate,
        conversion: a.instagram_followers ? (a.total_uses / a.instagram_followers) * 100 : 0,
        revenue: a.total_revenue,
      }))
  }, [affiliates])

  const stats = useMemo(() => {
    const list = affiliates ?? []
    const totalRevenue = list.reduce((sum, a) => sum + a.total_revenue, 0)
    const withRoi = list.filter((a) => a.roi_pct !== null)
    const avgRoi = withRoi.length ? withRoi.reduce((sum, a) => sum + (a.roi_pct ?? 0), 0) / withRoi.length : 0
    const totalContent = list.reduce((sum, a) => sum + (a.coupons.length > 0 ? a.coupons.length : 0), 0)
    return { totalAffiliates: list.length, totalRevenue, avgRoi, totalContent }
  }, [affiliates])

  if (isLoading) {
    return <p className="font-sans text-sm text-gray-400">Carregando performance...</p>
  }

  return (
    <div className="space-y-5">
      {/* Stats gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-3">
          <Users size={22} className="text-verde-vivid" />
          <div>
            <p className="font-serif text-2xl text-gray-900">{stats.totalAffiliates}</p>
            <p className="font-sans text-xs text-gray-500">Afiliadas no programa</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-3">
          <DollarSign size={22} className="text-verde-vivid" />
          <div>
            <p className="font-serif text-2xl text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            <p className="font-sans text-xs text-gray-500">Receita via cupons</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-3">
          <TrendingUp size={22} className="text-verde-vivid" />
          <div>
            <p className="font-serif text-2xl text-gray-900">{stats.avgRoi.toFixed(0)}%</p>
            <p className="font-sans text-xs text-gray-500">ROI médio</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-3">
          <Image size={22} className="text-verde-vivid" />
          <div>
            <p className="font-serif text-2xl text-gray-900">{stats.totalContent}</p>
            <p className="font-sans text-xs text-gray-500">Cupons ativos (UGC)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Receita por afiliada */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Receita Gerada por Afiliada</h3>
          {revenueData.length === 0 ? (
            <p className="font-sans text-sm text-gray-400">Sem dados de receita ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} name="Receita">
                  {revenueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Engajamento vs conversão */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-gray-900 mb-3">Engajamento × Conversão</h3>
          {scatterData.length < 2 ? (
            <p className="font-sans text-sm text-gray-400">Dados insuficientes para o gráfico (mínimo 2 afiliadas com vendas via cupom).</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="engagement" name="Engajamento %" unit="%" tick={{ fontSize: 11 }} />
                <YAxis dataKey="conversion" name="Conversão %" unit="%" tick={{ fontSize: 11 }} />
                <ZAxis dataKey="revenue" range={[60, 300]} name="Receita" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number) => v.toFixed(2)} />
                <Scatter data={scatterData} fill="#6BB42E" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Ranking ROI */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-serif text-lg text-gray-900">Ranking por ROI</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5">#</th>
                <th className="px-5 py-2.5">Afiliada</th>
                <th className="px-5 py-2.5 text-right">Receita</th>
                <th className="px-5 py-2.5 text-right">Custo produto</th>
                <th className="px-5 py-2.5 text-right">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Nenhum dado de investimento registrado ainda.</td></tr>
              ) : ranked.map((a, i) => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-2.5 text-gray-700 font-semibold">{a.name}</td>
                  <td className="px-5 py-2.5 text-right text-gray-600">{formatCurrency(a.total_revenue)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-600">{formatCurrency(a.total_product_cost + a.investment)}</td>
                  <td className={`px-5 py-2.5 text-right font-semibold ${(a.roi_pct ?? 0) >= 100 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
                    {(a.roi_pct ?? 0).toFixed(0)}%
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
