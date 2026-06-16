import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, Instagram, MapPin, Copy, Plus, Check } from 'lucide-react'
import { AFFILIATE_STATUS_LABELS, SKU_LABELS, CMV_BY_SKU } from '../../../constants/business'
import { NICHE_LABELS, STAGE_BADGE, CONTENT_TYPE_LABELS } from '../constants'
import { formatCurrency, formatNumber, formatDate } from '../../../utils/formatters'
import {
  useAffiliate, useUpdateAffiliateStage, useAddProductSent, useAddContent, useUpdateAffiliateNotes, useCreateCoupon,
} from '../../../hooks/useAfiliadas'
import type { AffiliateStatus, SKUType, AffiliateContentType } from '../../../types'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function SendProductForm({ affiliateId, onDone }: { affiliateId: string; onDone: () => void }) {
  const [sku, setSku] = useState<SKUType>('mango_sour')
  const [units, setUnits] = useState('12')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const addProduct = useAddProductSent()
  const updateStage = useUpdateAffiliateStage()

  const handleSubmit = async () => {
    const unitsNum = Number(units) || 0
    const cost = (CMV_BY_SKU[sku] ?? 3.95) * unitsNum
    try {
      await addProduct.mutateAsync({ affiliate_id: affiliateId, sku, sent_date: date, cost })
      await updateStage.mutateAsync({ id: affiliateId, stage: 'produto_enviado' })
      toast.success('Produto enviado registrado')
      onDone()
    } catch {
      toast.error('Erro ao registrar envio')
    }
  }

  return (
    <div className="bg-areia border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <select value={sku} onChange={(e) => setSku(e.target.value as SKUType)} className="border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid col-span-1">
          {Object.entries(SKU_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="number" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="Unidades" className="border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold text-gray-500 hover:bg-white">Cancelar</button>
        <button onClick={handleSubmit} disabled={addProduct.isPending} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
          Confirmar envio
        </button>
      </div>
    </div>
  )
}

function AddContentForm({ affiliateId, onDone }: { affiliateId: string; onDone: () => void }) {
  const [type, setType] = useState<AffiliateContentType>('reel')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [reach, setReach] = useState('')
  const [url, setUrl] = useState('')
  const addContent = useAddContent()

  const handleSubmit = async () => {
    try {
      await addContent.mutateAsync({
        affiliate_id: affiliateId,
        date,
        type,
        url: url || undefined,
        estimated_reach: reach ? Number(reach) : undefined,
      })
      toast.success('Conteúdo registrado')
      setUrl('')
      setReach('')
      onDone()
    } catch {
      toast.error('Erro ao registrar conteúdo')
    }
  }

  return (
    <div className="bg-areia border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as AffiliateContentType)} className="border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid">
          {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid" />
        <input type="number" value={reach} onChange={(e) => setReach(e.target.value)} placeholder="Alcance estimado" className="border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid" />
      </div>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link do post (opcional)" className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid" />
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold text-gray-500 hover:bg-white">Cancelar</button>
        <button onClick={handleSubmit} disabled={addContent.isPending} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
          Adicionar
        </button>
      </div>
    </div>
  )
}

export default function AffiliateDetailPanel({ affiliateId, onClose }: { affiliateId: string; onClose: () => void }) {
  const { data, isLoading } = useAffiliate(affiliateId)
  const updateStage = useUpdateAffiliateStage()
  const createCoupon = useCreateCoupon()
  const updateNotes = useUpdateAffiliateNotes()
  const [showSendProduct, setShowSendProduct] = useState(false)
  const [showAddContent, setShowAddContent] = useState(false)
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState(false)

  const handleStage = async (stage: AffiliateStatus) => {
    try {
      await updateStage.mutateAsync({ id: affiliateId, stage })
      toast.success(`Movido para ${AFFILIATE_STATUS_LABELS[stage]}`)
    } catch {
      toast.error('Erro ao atualizar estágio')
    }
  }

  const handleCreateCoupon = async () => {
    if (!data) return
    try {
      await createCoupon.mutateAsync({ affiliate_id: data.id, affiliate_name: data.name, discount_pct: 15 })
      toast.success('Cupom criado')
    } catch {
      toast.error('Erro ao criar cupom')
    }
  }

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Código copiado')
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSaveNotes = async () => {
    if (!data) return
    try {
      await updateNotes.mutateAsync({ id: data.id, notes })
      toast.success('Notas salvas')
    } catch {
      toast.error('Erro ao salvar notas')
    }
  }

  const coupon = data?.coupons[0]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg h-full overflow-y-auto shadow-xl">
        {isLoading || !data ? (
          <p className="font-sans text-sm text-gray-400 p-5">Carregando afiliada...</p>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl text-gray-900 truncate">{data.name}</h2>
                  {data.instagram_handle && (
                    <a
                      href={`https://instagram.com/${data.instagram_handle.replace('@', '')}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 font-sans text-sm text-verde-vivid hover:underline"
                    >
                      <Instagram size={13} /> {data.instagram_handle}
                    </a>
                  )}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[data.status]}`}>
                  {AFFILIATE_STATUS_LABELS[data.status]}
                </span>
                {(data.niche ?? []).map((n) => (
                  <span key={n} className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rosa-pale text-rosa-vivid">
                    {NICHE_LABELS[n] ?? n}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Perfil */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Perfil</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Seguidores</p>
                    <p className="font-sans text-sm font-semibold text-gray-800">{data.instagram_followers ? formatNumber(data.instagram_followers) : '—'}</p>
                  </div>
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Engajamento</p>
                    <p className="font-sans text-sm font-semibold text-gray-800">{data.engagement_rate ? `${data.engagement_rate}%` : '—'}</p>
                  </div>
                  {data.city && (
                    <div className="bg-areia rounded-lg p-3 col-span-2 flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <p className="font-sans text-sm text-gray-700">{data.city}</p>
                    </div>
                  )}
                  {data.contact && (
                    <div className="bg-areia rounded-lg p-3 col-span-2">
                      <p className="font-sans text-[11px] text-gray-400">Contato</p>
                      <p className="font-sans text-sm text-gray-700">{data.contact}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações de estágio */}
              <div className="flex flex-wrap gap-2">
                {data.status === 'mapeada' && (
                  <button onClick={() => handleStage('qualificada')} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-blue-50 text-blue-600 hover:bg-blue-100">
                    Qualificar
                  </button>
                )}
                {data.status === 'qualificada' && (
                  <button onClick={() => handleStage('contatada')} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-amarelo-pale text-yellow-700 hover:opacity-80">
                    Contatar
                  </button>
                )}
                {data.status === 'contatada' && !showSendProduct && (
                  <button onClick={() => setShowSendProduct(true)} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-purple-50 text-purple-600 hover:bg-purple-100">
                    Enviar produto
                  </button>
                )}
                {data.status === 'produto_enviado' && (
                  <button onClick={() => handleStage('publicou')} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-verde-pale text-verde-vivid hover:bg-verde-mid hover:text-white">
                    Publicou!
                  </button>
                )}
                {data.status === 'publicou' && (
                  <button onClick={() => handleStage('parceira')} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-verde-vivid text-white hover:bg-verde-mid">
                    Tornar parceira
                  </button>
                )}
                {data.status !== 'inativa' && data.status !== 'parceira' && (
                  <button onClick={() => handleStage('inativa')} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-rosa-pale text-rosa-vivid hover:opacity-80">
                    Marcar inativa
                  </button>
                )}
              </div>
              {showSendProduct && <SendProductForm affiliateId={data.id} onDone={() => setShowSendProduct(false)} />}

              {/* Timeline */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Linha do tempo</p>
                <div className="space-y-2">
                  {data.stage_history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between font-sans text-sm">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[h.stage]}`}>
                        {AFFILIATE_STATUS_LABELS[h.stage] ?? h.stage}
                      </span>
                      <span className="text-gray-400 text-xs">{formatDateTime(h.changed_at)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Produto enviado */}
              {data.products.length > 0 && (
                <div>
                  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Produto enviado</p>
                  <div className="space-y-2">
                    {data.products.map((p) => (
                      <div key={p.id} className="bg-areia rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-sans text-sm font-semibold text-gray-800">{SKU_LABELS[p.sku] ?? p.sku}</p>
                          <p className="font-sans text-xs text-gray-400">{formatDate(p.sent_date)}</p>
                        </div>
                        <p className="font-sans text-sm text-gray-700">{formatCurrency(p.cost)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cupom */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Cupom</p>
                  {!coupon && (
                    <button onClick={handleCreateCoupon} disabled={createCoupon.isPending} className="flex items-center gap-1 text-verde-vivid hover:text-verde-mid">
                      <Plus size={14} /><span className="font-sans text-xs font-semibold">Criar cupom</span>
                    </button>
                  )}
                </div>
                {coupon ? (
                  <div className="bg-verde-pale border border-verde-mid rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-lg text-gray-900">{coupon.code}</p>
                      <button onClick={() => handleCopyCoupon(coupon.code)} className="flex items-center gap-1 text-verde-vivid hover:text-verde-mid">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        <span className="font-sans text-xs font-semibold">Copiar</span>
                      </button>
                    </div>
                    <p className="font-sans text-xs text-gray-600">Desconto de {coupon.discount_pct}%</p>
                  </div>
                ) : (
                  <p className="font-sans text-xs text-gray-400">Nenhum cupom criado.</p>
                )}
              </div>

              {/* Performance */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Performance</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Usos do cupom</p>
                    <p className="font-serif text-xl text-gray-900">{formatNumber(data.total_uses)}</p>
                  </div>
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Receita gerada</p>
                    <p className="font-serif text-xl text-gray-900">{formatCurrency(data.total_revenue)}</p>
                  </div>
                  <div className="bg-areia rounded-lg p-3 col-span-2">
                    <p className="font-sans text-[11px] text-gray-400">ROI (receita − custo de produto − investimento)</p>
                    <p className={`font-serif text-xl ${data.roi >= 0 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>{formatCurrency(data.roi)}</p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Conteúdo gerado</p>
                  <button onClick={() => setShowAddContent((v) => !v)} className="flex items-center gap-1 text-verde-vivid hover:text-verde-mid">
                    <Plus size={14} /><span className="font-sans text-xs font-semibold">Adicionar</span>
                  </button>
                </div>
                {showAddContent && <div className="mb-2"><AddContentForm affiliateId={data.id} onDone={() => setShowAddContent(false)} /></div>}
                {data.content.length === 0 ? (
                  <p className="font-sans text-xs text-gray-400">Nenhum conteúdo registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {data.content.map((c) => (
                      <div key={c.id} className="bg-areia rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-sans text-sm font-semibold text-gray-800">{CONTENT_TYPE_LABELS[c.type]}</p>
                          <p className="font-sans text-xs text-gray-400">{formatDate(c.date)}</p>
                        </div>
                        <p className="font-sans text-xs text-gray-600">{c.estimated_reach ? `${formatNumber(c.estimated_reach)} alcance` : '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Notas</p>
                <textarea
                  defaultValue={data.notes ?? ''}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  rows={3}
                  className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
