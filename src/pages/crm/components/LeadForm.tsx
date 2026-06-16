import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { CHANNEL_LABELS } from '../../../constants/business'
import { ORIGIN_OPTIONS } from '../constants'
import { useCreateLead, useProfiles } from '../../../hooks/useCRM'
import { useAuth } from '../../../hooks/useAuth'
import type { CanaisType } from '../../../types'

const leadSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  business_name: z.string().min(1, 'Informe a empresa'),
  phone: z.string().min(1, 'Informe o telefone'),
  email: z.string().optional(),
  instagram: z.string().optional(),
  canal: z.enum(['evento', 'on_trade', 'distribuidor', 'dtc_site', 'dtc_ml', 'dtc_amazon']),
  origin: z.string().min(1, 'Informe a origem'),
  assigned_to: z.string().min(1, 'Selecione o responsável'),
  estimated_monthly_units: z.coerce.number().optional(),
  city: z.string().min(1, 'Informe a cidade/bairro'),
  notes: z.string().optional(),
})

type LeadFormValues = z.infer<typeof leadSchema>

const CANAL_OPTIONS: CanaisType[] = ['on_trade', 'distribuidor', 'evento', 'dtc_site', 'dtc_ml', 'dtc_amazon']

export default function LeadForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useAuth()
  const { data: profiles } = useProfiles()
  const createLead = useCreateLead()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      business_name: '',
      phone: '',
      email: '',
      instagram: '',
      canal: 'on_trade',
      origin: '',
      assigned_to: profile?.id ?? '',
      estimated_monthly_units: undefined,
      city: '',
      notes: '',
    },
  })

  const onSubmit = async (values: LeadFormValues) => {
    try {
      const { city, ...rest } = values
      const [cidade, bairro] = city.split('/').map((s) => s.trim())
      await createLead.mutateAsync({
        ...rest,
        email: values.email || undefined,
        instagram: values.instagram || undefined,
        city: cidade || city,
        neighborhood: bairro || undefined,
        estimated_monthly_units: values.estimated_monthly_units || undefined,
      })
      toast.success('Lead criado')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao criar lead')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Lead" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nome completo</label>
            <input {...register('name')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.name && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.name.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Empresa / Estabelecimento</label>
            <input {...register('business_name')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.business_name && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.business_name.message}</p>}
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Telefone</label>
            <input {...register('phone')} placeholder="11999999999" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.phone && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input {...register('email')} type="email" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Instagram</label>
            <input {...register('instagram')} placeholder="@perfil" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Canal de venda</label>
            <select {...register('canal')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              {CANAL_OPTIONS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Origem</label>
            <select {...register('origin')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              <option value="">Selecione...</option>
              {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {errors.origin && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.origin.message}</p>}
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Responsável</label>
            <select {...register('assigned_to')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              <option value="">Selecione...</option>
              {(profiles ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            {errors.assigned_to && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.assigned_to.message}</p>}
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Estimativa mensal (latas)</label>
            <input {...register('estimated_monthly_units')} type="number" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div className="col-span-2">
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Cidade / Bairro</label>
            <input {...register('city')} placeholder="São Paulo / Pinheiros" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.city && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.city.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Notas iniciais</label>
            <textarea {...register('notes')} rows={2} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Criar Lead'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
