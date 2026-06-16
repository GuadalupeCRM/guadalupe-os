import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { SKU_LABELS } from '../../../constants/business'
import { PAYMENT_METHODS } from '../constants'
import { useCreateEventSale } from '../../../hooks/useEventos'
import type { SKUType } from '../../../types'

const SKUS: SKUType[] = ['mango_sour', 'margarita_lime', 'paloma_grapefruit']

export default function QuickSaleModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [sku, setSku] = useState<SKUType>('mango_sour')
  const [units, setUnits] = useState('1')
  const [unitPrice, setUnitPrice] = useState('9.00')
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0])
  const createSale = useCreateEventSale()

  const handleSubmit = async () => {
    if (Number(units) <= 0) {
      toast.error('Informe a quantidade')
      return
    }
    try {
      await createSale.mutateAsync({
        event_id: eventId,
        sku,
        units: Number(units),
        unit_price: Number(unitPrice),
        payment_method: paymentMethod,
      })
      toast.success('Venda registrada')
      onClose()
    } catch {
      toast.error('Erro ao registrar venda')
    }
  }

  return (
    <Modal open onClose={onClose} title="Registrar Venda">
      <div className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">SKU</label>
          <select value={sku} onChange={(e) => setSku(e.target.value as SKUType)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {SKUS.map((s) => <option key={s} value={s}>{SKU_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Unidades</label>
            <input type="number" value={units} onChange={(e) => setUnits(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Preço unitário (R$)</label>
            <input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Forma de pagamento</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={createSale.isPending} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {createSale.isPending ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
