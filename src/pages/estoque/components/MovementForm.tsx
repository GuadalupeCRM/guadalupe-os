import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { SKU_LABELS, BARRIL_SKUS, BARRIL_SKU_LABELS } from '../../../constants/business'
import { MOVEMENT_TYPE_LABELS } from '../constants'
import { useCreateMovement, SKUS } from '../../../hooks/useEstoque'
import type { SKUType, BarrilSKUType, InventoryMovementType } from '../../../types'

const movementSchema = z.object({
  date: z.string().min(1, 'Informe a data'),
  sku: z.enum([
    'mango_sour', 'margarita_lime', 'paloma_grapefruit',
    'mango_sour_barril', 'margarita_lime_barril', 'paloma_grapefruit_barril',
  ]),
  type: z.enum(['entrada', 'saida']),
  units: z.coerce.number().positive('Informe uma quantidade maior que zero'),
  notes: z.string().optional(),
  bling_nf_id: z.string().optional(),
})

type MovementFormValues = z.infer<typeof movementSchema>

export default function MovementForm({
  open, onClose, defaultSku, defaultType,
}: {
  open: boolean
  onClose: () => void
  defaultSku?: SKUType | BarrilSKUType
  defaultType?: InventoryMovementType
}) {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      sku: defaultSku ?? 'mango_sour',
      type: defaultType ?? 'entrada',
      units: undefined as unknown as number,
      notes: '',
      bling_nf_id: '',
    },
  })
  const createMovement = useCreateMovement()
  const selectedSku = watch('sku')
  const isBarril = (BARRIL_SKUS as readonly string[]).includes(selectedSku)

  const onSubmit = async (values: MovementFormValues) => {
    try {
      await createMovement.mutateAsync({
        date: values.date,
        sku: values.sku,
        type: values.type,
        units: values.units,
        notes: values.notes || undefined,
        bling_nf_id: values.bling_nf_id || undefined,
      })
      toast.success('Estoque atualizado')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao atualizar estoque')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Atualizar Estoque">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Data</label>
            <input type="date" {...register('date')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.date && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Tipo</label>
            <select {...register('type')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">SKU</label>
          <select {...register('sku')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            <optgroup label="Latas">
              {SKUS.map((sku) => <option key={sku} value={sku}>{SKU_LABELS[sku]}</option>)}
            </optgroup>
            <optgroup label="Barris (30L)">
              {BARRIL_SKUS.map((sku) => <option key={sku} value={sku}>{BARRIL_SKU_LABELS[sku]} (Barril)</option>)}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">
            Unidades ({isBarril ? 'barris' : 'latas'})
          </label>
          <input type="number" {...register('units')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.units && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.units.message}</p>}
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Notas</label>
          <textarea {...register('notes')} rows={2} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">NF Bling (opcional)</label>
          <input type="text" {...register('bling_nf_id')} placeholder="Ex: NF-9001" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
