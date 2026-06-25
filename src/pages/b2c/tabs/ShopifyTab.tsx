import { useState } from 'react'
import { ShoppingBag, RefreshCw, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'
import { useShopifyOrders, useShopifyConnectionStatus, useSyncShopify, useShopifyDailyRevenue, useB2COverview } from '../../../hooks/useB2C'
import { SKU_LABELS } from '../../../constants/business'
import { formatCurrency, formatDate, formatNumber } from '../../../utils/formatters'

export default function ShopifyTab() {
  const { data: connection } = useShopifyConnectionStatus()
  const { data: orders, isLoading: loadingOrders } = useShopifyOrders(50)
  const dailyRevenue = useShopifyDailyRevenue(30)
  const { data: overview } = useB2COverview()
  const syncShopify = useSyncShopify()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncShopify.mutateAsync()
      toast.success('Dados atualizados')
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setSyncing(false)
    }
  }

  const chartData = dailyRevenue.map((d) => ({ ...d, label: formatDate(d.date) }))

  return (
    <div className="space-y-5">
      {/* Status de conexão */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connection?.connected ? 'bg-verde-pale' : 'bg-amarelo-pale'}`}>
            <ShoppingBag size={18} className={connection?.connected ? 'text-verde-vivid' : 'text-amarelo-vivid'} />
          </div>
          <div className="flex items-center gap-2">
            <p className="font-sans font-semibold text-sm text-gray-800">
              {connection?.connected ? 'Shopify conectado' : 'Webhook Shopify não configurado'}
            </p>
            {connection?.connected
              ? <CheckCircle size={14} className="text-verde-vivid" />
              : <XCircle size={14} className="text-gray-300" />}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href="https://admin.shopify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm border border-areia-warm text-gray-600 hover:bg-areia"
          >
            <ExternalLink size={14} /> Ver loja
          </a>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sincronizar agora
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Ticket médio (AOV)</p>
          <p className="font-serif text-3xl text-gray-900">{formatCurrency(overview?.aov ?? 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Pedidos no mês</p>
          <p className="font-serif text-3xl text-gray-900">{formatNumber(overview?.ordersThisMonth ?? 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Carrinho abandonado</p>
          <p className="font-serif text-3xl text-gray-900">—</p>
          <p className="font-sans text-xs text-gray-400 mt-1">Requer webhook checkouts/abandoned no Shopify</p>
        </div>
      </div>

      {/* Receita por dia */}
      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-3">Receita por dia (últimos 30 dias)</p>
        {chartData.length === 0 ? (
          <p className="font-sans text-sm text-gray-400">Sem pedidos no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={60} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Receita" stroke="#E21655" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabela de pedidos */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-serif text-lg text-gray-900">Pedidos recentes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5">Data</th>
                <th className="px-5 py-2.5">Cliente</th>
                <th className="px-5 py-2.5">SKUs</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
                <th className="px-5 py-2.5">Cupom</th>
                <th className="px-5 py-2.5">Canal</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Carregando pedidos...</td></tr>
              ) : !orders || orders.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Nenhum pedido sincronizado ainda. Configure o webhook orders/paid no Shopify.</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-500">{o.order_date ? formatDate(o.order_date.slice(0, 10)) : '—'}</td>
                  <td className="px-5 py-2.5 text-gray-800 font-semibold">{o.customer_name || o.customer_email || '—'}</td>
                  <td className="px-5 py-2.5 text-gray-600">
                    {(o.skus ?? []).map((s) => SKU_LABELS[s.sku] ?? s.sku).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-2.5 text-right text-gray-700 font-semibold">{formatCurrency(Number(o.total_value))}</td>
                  <td className="px-5 py-2.5 text-gray-500">{o.discount_code || '—'}</td>
                  <td className="px-5 py-2.5">
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-verde-pale text-verde-vivid">
                      {o.canal}
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
