import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { NICHE_OPTIONS } from '../constants'
import { useCreateAffiliate } from '../../../hooks/useAfiliadas'

const affiliateSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  instagram_handle: z.string().optional(),
  instagram_followers: z.coerce.number().optional(),
  engagement_rate: z.coerce.number().optional(),
  niche: z.array(z.string()).optional(),
  city: z.string().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
})

type AffiliateFormData = z.infer<typeof affiliateSchema>

export default function AffiliateForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<AffiliateFormData>({
    resolver: zodResolver(affiliateSchema),
    defaultValues: { name: '', instagram_handle: '', city: '', contact: '', notes: '', niche: [] },
  })
  const createAffiliate = useCreateAffiliate()

  const onSubmit = async (values: AffiliateFormData) => {
    try {
      await createAffiliate.mutateAsync({
        name: values.name,
        instagram_handle: values.instagram_handle || undefined,
        instagram_followers: values.instagram_followers || undefined,
        engagement_rate: values.engagement_rate || undefined,
        niche: values.niche,
        city: values.city || undefined,
        contact: values.contact || undefined,
        notes: values.notes || undefined,
      })
      toast.success('Afiliada cadastrada')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao cadastrar afiliada')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Afiliada">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nome</label>
          <input {...register('name')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.name && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Instagram (@)</label>
            <input {...register('instagram_handle')} placeholder="@usuario" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Cidade</label>
            <input {...register('city')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Seguidores</label>
            <input type="number" {...register('instagram_followers')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Engajamento %</label>
            <input type="number" step="0.1" {...register('engagement_rate')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nicho</label>
          <Controller
            name="niche"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {NICHE_OPTIONS.map((opt) => {
                  const checked = (field.value ?? []).includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const current = field.value ?? []
                        field.onChange(checked ? current.filter((v) => v !== opt.value) : [...current, opt.value])
                      }}
                      className={`font-sans text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                        checked ? 'bg-verde-vivid text-white' : 'bg-areia text-gray-500 hover:bg-areia-warm'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}
          />
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Contato</label>
          <input {...register('contact')} placeholder="Telefone, e-mail ou WhatsApp" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Notas</label>
          <textarea {...register('notes')} rows={2} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
