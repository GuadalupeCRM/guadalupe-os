import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { EVENT_TYPE_LABELS, EVENT_TYPE_OPTIONS } from '../constants'
import { useCreateEvent } from '../../../hooks/useEventos'
import { useProfiles } from '../../../hooks/useCRM'
import { useAuth } from '../../../hooks/useAuth'

const eventSchema = z.object({
  name: z.string().min(1, 'Informe o nome do evento'),
  venue: z.string().min(1, 'Informe o local'),
  address: z.string().optional(),
  city: z.string().min(1, 'Informe a cidade'),
  event_date: z.string().min(1, 'Informe a data'),
  event_type: z.enum(['balada', 'festival', 'corporativo', 'gastro', 'proprio', 'outro']),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  estimated_attendees: z.coerce.number().optional(),
  estimated_units_sold: z.coerce.number().optional(),
  estimated_revenue: z.coerce.number().optional(),
  assigned_to: z.string().min(1, 'Selecione o responsável'),
  notes: z.string().optional(),
})

type EventFormValues = z.infer<typeof eventSchema>

export default function EventForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth()
  const { data: profiles } = useProfiles()
  const createEvent = useCreateEvent()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      venue: '',
      address: '',
      city: '',
      event_date: '',
      event_type: 'balada',
      contact_name: '',
      contact_phone: '',
      estimated_attendees: undefined,
      estimated_units_sold: undefined,
      estimated_revenue: undefined,
      assigned_to: profile?.id ?? '',
      notes: '',
    },
  })

  const onSubmit = async (values: EventFormValues) => {
    try {
      await createEvent.mutateAsync({
        ...values,
        address: values.address || undefined,
        contact_name: values.contact_name || undefined,
        contact_phone: values.contact_phone || undefined,
        estimated_attendees: values.estimated_attendees || undefined,
        estimated_units_sold: values.estimated_units_sold || undefined,
        estimated_revenue: values.estimated_revenue || undefined,
        notes: values.notes || undefined,
      })
      toast.success('Evento criado')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao criar evento')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Evento" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nome do evento</label>
            <input {...register('name')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.name && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Local / Venue</label>
            <input {...register('venue')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.venue && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.venue.message}</p>}
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Cidade</label>
            <input {...register('city')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.city && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.city.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Endereço</label>
            <input {...register('address')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Data do evento</label>
            <input {...register('event_date')} type="date" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.event_date && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.event_date.message}</p>}
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Tipo</label>
            <select {...register('event_type')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              {EVENT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Contato (nome)</label>
            <input {...register('contact_name')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Contato (telefone)</label>
            <input {...register('contact_phone')} placeholder="11999999999" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Estimativa de presença</label>
            <input {...register('estimated_attendees')} type="number" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Estimativa de latas</label>
            <input {...register('estimated_units_sold')} type="number" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Estimativa de receita (R$)</label>
            <input {...register('estimated_revenue')} type="number" step="0.01" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Responsável</label>
            <select {...register('assigned_to')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              <option value="">Selecione...</option>
              {(profiles ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            {errors.assigned_to && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.assigned_to.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Notas</label>
            <textarea {...register('notes')} rows={2} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Criar Evento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
