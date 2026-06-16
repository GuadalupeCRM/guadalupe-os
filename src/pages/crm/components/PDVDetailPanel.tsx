import { useState } from 'react'
import { X, Phone, MapPin, Building2, Plus, ShoppingCart } from 'lucide-react'
import { CHANNEL_LABELS, SKU_LABELS } from '../../../constants/business'
import { CANAL_BADGE } from '../constants'
import { formatCurrency, formatNumber, formatDate } from '../../../utils/formatters'
import { usePDVs, usePDVOrders } from '../../../hooks/useCRM'
import RegistrarPedidoModal from './RegistrarPedidoModal'

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  em_risco: 'Em Risco',
  inativo: 'Inativo',
}

const STATUS_BADGE: Record<string, string> = {
  ativo: 'bg-verde-pale text-verde-vivid',
  em_risco: 'bg-rosa-pale text-rosa-vivid',
  inativo: 'bg-gray-100 text-gray-400',
}

export default function PDVDetailPanel({ pdvId, onClose }: { pdvId: string; onClose: () => void }) {
  const { data: pdvs } = usePDVs()
  const { data: orders, isLoading: loadingOrders } = usePDVOrders(pdvId)
  const [showOrderModal, setShowOrderModal] = useState(false)

  const pdv = pdvs?.find((p) => p.id === pdvId)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg h-full overflow-y-auto shadow-xl">
        {!pdv ? (
          <p className="font-sans text-sm text-gray-400 p-5">Carregando PDV...</p>
        ) : (
          <>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl text-gray-900 truncate">{pdv.business_name}</h2>
                  {pdv.owner_name && <p className="font-sans text-sm text-gray-500">{pdv.owner_name}</p>}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CANAL_BADGE[pdv.canal] ?? 'bg-gray-100 text-gray-500'}`}>
                  {CHANNEL_LABELS[pdv.canal] ?? pdv.canal}
                </span>
                <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_BADGE[pdv.status]}`}>
                  {STATUS_LABELS[pdv.status]}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Info */}
              <div className="space-y-1.5">
                {pdv.phone && (
                  <div className="flex items-center gap-2 font-sans text-sm">
                    <Phone size={14} className="text-gray-400" />
                    <a href={`tel:${pdv.phone}`} className="text-gray-700 hover:text-verde-vivid">{pdv.phone}</a>
                  </div>
                )}
                {pdv.cnpj && (
                  <div className="flex items-center gap-2 font-sans text-sm">
                    <Building2 size={14} className="text-gray-400" />
                    <span className="text-gray-700">{pdv.cnpj}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 font-sans text-sm">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-gray-700">{[pdv.address, pdv.neighborhood, pdv.city].filter(Boolean).join(', ')}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-areia rounded-lg p-3">
                  <p className="font-sans text-[11px] text-gray-400">Média mensal</p>
                  <p className="font-serif text-xl text-gray-900">{formatNumber(pdv.monthly_avg_units)} latas</p>
                </div>
                <div className="bg-areia rounded-lg p-3">
                  <p className="font-sans text-[11px] text-gray-400">Último pedido</p>
                  <p className="font-serif text-xl text-gray-900">{pdv.last_order_date ? formatDate(pdv.last_order_date) : '—'}</p>
                </div>
              </div>

              {pdv.notes && <p className="font-sans text-xs text-gray-500 italic bg-areia rounded-lg p-3">{pdv.notes}</p>}

              {/* Registrar pedido */}
              <button
                onClick={() => setShowOrderModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid"
              >
                <Plus size={16} /> Registrar Pedido
              </button>

              {/* Histórico de pedidos */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Histórico de Pedidos</p>
                {loadingOrders ? (
                  <p className="font-sans text-xs text-gray-400">Carregando...</p>
                ) : !orders || orders.length === 0 ? (
                  <p className="font-sans text-xs text-gray-400">Nenhum pedido registrado.</p>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-areia flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ShoppingCart size={13} className="text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-sans text-xs font-semibold text-gray-700">{formatDate(order.date)}</p>
                            <p className="font-sans text-xs font-bold text-gray-800">{formatCurrency(Number(order.total))}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {order.items.map((item, i) => (
                              <span key={i} className="font-sans text-[11px] text-gray-500 bg-areia rounded-full px-2 py-0.5">
                                {SKU_LABELS[item.sku] ?? item.sku} × {item.units}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showOrderModal && <RegistrarPedidoModal pdvId={pdvId} onClose={() => setShowOrderModal(false)} />}
    </div>
  )
}
