import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { useCreateCampaign } from '../../../hooks/useAds'
import { CANAL_OPTIONS, PLATFORM_OPTIONS, TIER_LABELS, TIER_ORDER } from '../constants'

const campaignSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  platform: z.string().min(1, 'Selecione a plataforma'),
  budget_tier: z.enum(['core', 'growing', 'test']),
  canal: z.string().optional(),
  monthly_budget: z.coerce.number().min(1, 'Informe o budget'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

type CampaignFormValues = z.infer<typeof campaignSchema>

export default function CampaignForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createCampaign = useCreateCampaign()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      platform: PLATFORM_OPTIONS[0],
      budget_tier: 'core',
      canal: '',
      monthly_budget: undefined,
      start_date: '',
      end_date: '',
    },
  })

  const onSubmit = async (values: CampaignFormValues) => {
    try {
      await createCampaign.mutateAsync({
        ...values,
        canal: values.canal || undefined,
        start_date: values.start_date || undefined,
        end_date: values.end_date || undefined,
      })
      toast.success('Campanha criada')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao criar campanha')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Campanha" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nome</label>
          <input {...register('name')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.name && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Plataforma</label>
            <select {...register('platform')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              {PLATFORM_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Tier</label>
            <select {...register('budget_tier')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              {TIER_ORDER.map((t) => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Canal</label>
            <select {...register('canal')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              <option value="">—</option>
              {CANAL_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Budget mensal (R$)</label>
            <input type="number" step="0.01" {...register('monthly_budget')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.monthly_budget && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.monthly_budget.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Data início</label>
            <input type="date" {...register('start_date')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Data fim</label>
            <input type="date" {...register('end_date')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
            Criar Campanha
          </button>
        </div>
      </form>
    </Modal>
  )
}
