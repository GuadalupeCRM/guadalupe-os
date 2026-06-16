import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Copy, RefreshCw, Plus } from 'lucide-react'
import { COUPON_STATUS_LABELS } from '../constants'
import { formatCurrency, formatNumber } from '../../../utils/formatters'
import { useAffiliates, useCoupons, useShopifySyncCoupons, useCreateCoupon } from '../../../hooks/useAfiliadas'

function formatDateTime(iso?: string): string {
  if (!iso) return 'Nunca sincronizado'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function CuponsTab() {
  const { data: coupons, isLoading } = useCoupons()
  const { data: affiliates } = useAffiliates()
  const syncShopify = useShopifySyncCoupons()
  const createCoupon = useCreateCoupon()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedAffiliateId, setSelectedAffiliateId] = useState('')
  const [discountPct, setDiscountPct] = useState('15')

  const affiliateMap = useMemo(() => new Map((affiliates ?? []).map((a) => [a.id, a])), [affiliates])

  const availableAffiliates = useMemo(() => {
    const withCoupon = new Set((coupons ?? []).map((c) => c.affiliate_id))
    return (affiliates ?? []).filter((a) => !withCoupon.has(a.id))
  }, [affiliates, coupons])

  const lastSync = useMemo(() => {
    const synced = (coupons ?? []).map((c) => c.synced_at).filter(Boolean) as string[]
    if (synced.length === 0) return undefined
    return synced.sort().reverse()[0]
  }, [coupons])

  const topCoupons = useMemo(() => {
    return [...(coupons ?? [])].sort((a, b) => b.revenue_generated - a.revenue_generated).slice(0, 5)
  }, [coupons])

  const handleSync = async () => {
    try {
      await syncShopify.mutateAsync()
      toast.success('Cupons sincronizados com Shopify')
    } catch {
      toast.error('Erro ao sincronizar')
    }
  }

  const handleCreate = async () => {
    const affiliate = affiliateMap.get(selectedAffiliateId)
    if (!affiliate) {
      toast.error('Selecione uma afiliada')
      return
    }
    try {
      await createCoupon.mutateAsync({ affiliate_id: affiliate.id, affiliate_name: affiliate.name, discount_pct: Number(discountPct) || 10 })
      toast.success('Cupom criado')
      setShowCreate(false)
      setSelectedAffiliateId('')
    } catch {
      toast.error('Erro ao criar cupom')
    }
  }

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(`https://guadalupedrink.com.br/?discount=${code}`)
    toast.success('Link copiado')
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <p className="font-sans text-[11px] text-gray-400">Última sincronização Shopify</p>
          <p className="font-sans text-sm font-semibold text-gray-700">{formatDateTime(lastSync)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncShopify.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-areia text-gray-600 hover:bg-areia-warm disabled:opacity-50">
            <RefreshCw size={14} className={syncShopify.isPending ? 'animate-spin' : ''} /> {syncShopify.isPending ? 'Sincronizando...' : 'Sincronizar Shopify'}
          </button>
          <button onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid">
            <Plus size={16} /> Criar Cupom
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Afiliada</label>
            <select value={selectedAffiliateId} onChange={(e) => setSelectedAffiliateId(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              <option value="">Selecione...</option>
              {availableAffiliates.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Desconto %</label>
            <input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="w-24 border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <button onClick={handleCreate} disabled={createCoupon.isPending} className="px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            Criar
          </button>
        </div>
      )}

      {/* Top performing */}
      {topCoupons.length > 0 && (
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Top cupons por receita</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topCoupons.slice(0, 3).map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="font-serif text-lg text-gray-900">{c.code}</p>
                <p className="font-sans text-sm text-gray-500 truncate">{affiliateMap.get(c.affiliate_id)?.name ?? '—'}</p>
                <p className="font-serif text-2xl text-verde-vivid mt-1">{formatCurrency(c.revenue_generated)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando cupons...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-2.5">Afiliada</th>
                  <th className="px-5 py-2.5">Código</th>
                  <th className="px-5 py-2.5 text-right">Desconto</th>
                  <th className="px-5 py-2.5 text-right">Usos</th>
                  <th className="px-5 py-2.5 text-right">Receita</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {(coupons ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Nenhum cupom cadastrado.</td></tr>
                ) : (coupons ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-700">{affiliateMap.get(c.affiliate_id)?.name ?? '—'}</td>
                    <td className="px-5 py-2.5 font-semibold text-gray-800">{c.code}</td>
                    <td className="px-5 py-2.5 text-right text-gray-600">{c.discount_pct}%</td>
                    <td className="px-5 py-2.5 text-right text-gray-600">{formatNumber(c.uses)}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700 font-semibold">{formatCurrency(c.revenue_generated)}</td>
                    <td className="px-5 py-2.5">
                      <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.status === 'ativo' ? 'bg-verde-pale text-verde-vivid' : 'bg-gray-100 text-gray-400'}`}>
                        {COUPON_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button onClick={() => handleCopyLink(c.code)} className="flex items-center gap-1 text-gray-400 hover:text-verde-vivid ml-auto">
                        <Copy size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
