import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { SKU_LABELS } from '../../../constants/business'
import { useCreatePDVOrder } from '../../../hooks/useCRM'
import type { SKUType } from '../../../types'

const SKUS: SKUType[] = ['mango_sour', 'margarita_lime', 'paloma_grapefruit']

export default function RegistrarPedidoModal({ pdvId, onClose }: { pdvId: string; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [selected, setSelected] = useState<Record<SKUType, { units: string; unit_price: string } | null>>({
    mango_sour: null,
    margarita_lime: null,
    paloma_grapefruit: null,
  })
  const createOrder = useCreatePDVOrder()

  const toggleSku = (sku: SKUType) => {
    setSelected((prev) => ({
      ...prev,
      [sku]: prev[sku] ? null : { units: '', unit_price: '9.00' },
    }))
  }

  const updateField = (sku: SKUType, field: 'units' | 'unit_price', value: string) => {
    setSelected((prev) => ({
      ...prev,
      [sku]: prev[sku] ? { ...prev[sku]!, [field]: value } : null,
    }))
  }

  const handleSubmit = async () => {
    const items = SKUS
      .filter((sku) => selected[sku] && Number(selected[sku]!.units) > 0)
      .map((sku) => ({ sku, units: Number(selected[sku]!.units), unit_price: Number(selected[sku]!.unit_price) }))

    if (items.length === 0) {
      toast.error('Selecione pelo menos um SKU com quantidade')
      return
    }

    try {
      await createOrder.mutateAsync({ pdv_id: pdvId, date, items })
      toast.success('Pedido registrado')
      onClose()
    } catch {
      toast.error('Erro ao registrar pedido')
    }
  }

  return (
    <Modal open onClose={onClose} title="Registrar Pedido">
      <div className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>

        <div className="space-y-2">
          <label className="block font-sans text-xs font-semibold text-gray-500">SKUs</label>
          {SKUS.map((sku) => (
            <div key={sku} className="border border-areia-warm rounded-lg p-3">
              <label className="flex items-center gap-2 font-sans text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={!!selected[sku]} onChange={() => toggleSku(sku)} />
                {SKU_LABELS[sku]}
              </label>
              {selected[sku] && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block font-sans text-[11px] text-gray-400 mb-0.5">Unidades</label>
                    <input type="number" value={selected[sku]!.units} onChange={(e) => updateField(sku, 'units', e.target.value)} className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
                  </div>
                  <div>
                    <label className="block font-sans text-[11px] text-gray-400 mb-0.5">Preço unitário (R$)</label>
                    <input type="number" step="0.01" value={selected[sku]!.unit_price} onChange={(e) => updateField(sku, 'unit_price', e.target.value)} className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={createOrder.isPending} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {createOrder.isPending ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
