import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Mail, Plus, Bot, Users, UserPlus, UserMinus, Zap } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import {
  TRIGGER_TYPE_OPTIONS, TRIGGER_TYPE_LABELS, SEGMENT_OPTIONS,
} from '../constants'
import {
  useBrevoConnectionStatus, useBrevoCampaigns, useCreateCampaign, useGenerateCampaignContent,
  useEmailAutomations, useSubscriberStats,
} from '../../../hooks/useMarketing'
import { monthLabel } from '../../../hooks/useFinanceiro'
import { formatNumber, formatPercent, formatDate } from '../../../utils/formatters'
import type { EmailCampaignStatus, EmailTriggerType, EmailSegment } from '../../../types'

// ============================================================
// KPI
// ============================================================
function KPICard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-verde-pale flex items-center justify-center">
          <Icon size={14} className="text-verde-vivid" />
        </div>
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className="font-serif text-3xl text-gray-900">{value}</p>
    </div>
  )
}

// ============================================================
// CAMPAIGN BUILDER
// ============================================================
const campaignSchema = z.object({
  name: z.string().min(1, 'Informe o nome da campanha'),
  trigger_type: z.enum(['manual', 'pos_compra', 'reativacao', 'boas_vindas']),
  subject: z.string().min(1, 'Informe o assunto'),
  body: z.string().optional(),
  segment: z.enum(['todos', 'eventos', 'inativos']),
  sendOption: z.enum(['now', 'schedule']),
  scheduled_at: z.string().optional(),
}).refine((data) => data.sendOption !== 'schedule' || !!data.scheduled_at, {
  message: 'Informe a data e hora do agendamento', path: ['scheduled_at'],
})

type CampaignForm = z.infer<typeof campaignSchema>

function CampaignBuilderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '', trigger_type: 'manual', subject: '', body: '', segment: 'todos', sendOption: 'now', scheduled_at: '',
    },
  })
  const createCampaign = useCreateCampaign()
  const generateContent = useGenerateCampaignContent()
  const triggerType = watch('trigger_type')
  const sendOption = watch('sendOption')
  const subject = watch('subject')
  const body = watch('body')

  const handleGenerate = async () => {
    try {
      const content = await generateContent.mutateAsync(triggerType as EmailTriggerType)
      setValue('subject', content.subject)
      setValue('body', content.body)
      toast.success('Conteúdo gerado pelo agente')
    } catch {
      toast.error('Erro ao gerar conteúdo')
    }
  }

  const onSubmit = async (values: CampaignForm) => {
    try {
      const status: EmailCampaignStatus = values.sendOption === 'now' ? 'enviada' : 'agendada'
      await createCampaign.mutateAsync({
        name: values.name,
        trigger_type: values.trigger_type as EmailTriggerType,
        subject: values.subject,
        body: values.body,
        segment: values.segment as EmailSegment,
        status,
        scheduled_at: values.sendOption === 'schedule' ? new Date(values.scheduled_at!).toISOString() : undefined,
      })
      toast.success(values.sendOption === 'now' ? 'Campanha enviada' : 'Campanha agendada')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao salvar campanha')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Campanha" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nome da campanha</label>
          <input type="text" {...register('name')} placeholder="Ex: Promoção de inverno" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.name && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Tipo de disparo</label>
          <select {...register('trigger_type')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {TRIGGER_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Segmento de destinatários</label>
          <select {...register('segment')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {SEGMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="block font-sans text-xs font-semibold text-gray-500">Assunto</label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateContent.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-semibold text-xs bg-verde-pale text-verde-vivid hover:bg-verde-mid hover:text-white disabled:opacity-50"
          >
            <Bot size={14} /> {generateContent.isPending ? 'Gerando...' : 'Criar com agente'}
          </button>
        </div>
        <input type="text" {...register('subject')} placeholder="Assunto do email" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        {errors.subject && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.subject.message}</p>}

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Corpo do email</label>
          <textarea {...register('body')} rows={4} placeholder="Conteúdo do email..." className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>

        {(subject || body) && (
          <div className="bg-areia border border-gray-200 rounded-xl p-4">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Pré-visualização</p>
            <p className="font-serif text-base text-gray-900 mb-1">{subject || '(sem assunto)'}</p>
            <p className="font-sans text-sm text-gray-600 whitespace-pre-wrap">{body || '(sem conteúdo)'}</p>
          </div>
        )}

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Envio</label>
          <Controller
            control={control}
            name="sendOption"
            render={({ field }) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => field.onChange('now')}
                  className={`flex-1 px-3 py-2 rounded-lg font-sans font-semibold text-sm border ${
                    field.value === 'now' ? 'bg-verde-vivid text-white border-verde-vivid' : 'border-areia-warm text-gray-600 hover:bg-areia'
                  }`}
                >
                  Enviar agora
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange('schedule')}
                  className={`flex-1 px-3 py-2 rounded-lg font-sans font-semibold text-sm border ${
                    field.value === 'schedule' ? 'bg-verde-vivid text-white border-verde-vivid' : 'border-areia-warm text-gray-600 hover:bg-areia'
                  }`}
                >
                  Agendar
                </button>
              </div>
            )}
          />
        </div>

        {sendOption === 'schedule' && (
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Data e hora do envio</label>
            <input type="datetime-local" {...register('scheduled_at')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
            {errors.scheduled_at && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.scheduled_at.message}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : sendOption === 'now' ? 'Enviar agora' : 'Agendar campanha'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ============================================================
// TAB
// ============================================================
export default function EmailTab() {
  const { data: connection } = useBrevoConnectionStatus()
  const { data: campaigns, isLoading: loadingCampaigns } = useBrevoCampaigns()
  const { data: automations, isLoading: loadingAutomations } = useEmailAutomations()
  const { data: subscriberStats, isLoading: loadingStats } = useSubscriberStats()
  const [showBuilder, setShowBuilder] = useState(false)

  const latestStats = useMemo(() => (subscriberStats && subscriberStats.length > 0 ? subscriberStats[subscriberStats.length - 1] : null), [subscriberStats])

  const chartData = useMemo(() => {
    return (subscriberStats ?? []).map((s) => ({
      month: monthLabel(s.month.slice(0, 7)),
      total: s.total_subscribers,
    }))
  }, [subscriberStats])

  if (loadingCampaigns || loadingAutomations || loadingStats) {
    return <p className="font-sans text-sm text-gray-400">Carregando dados de email marketing...</p>
  }

  return (
    <div className="space-y-5">
      {/* Status de conexão */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connection?.connected ? 'bg-verde-pale' : 'bg-amarelo-pale'}`}>
            <Mail size={18} className={connection?.connected ? 'text-verde-vivid' : 'text-amarelo-vivid'} />
          </div>
          <div>
            <p className="font-sans font-semibold text-sm text-gray-800">
              {connection?.connected ? 'Brevo conectado' : 'Brevo não conectado'}
            </p>
            <p className="font-sans text-xs text-gray-400">
              {connection?.connected ? 'Campanhas e automações sincronizadas' : 'Conecte a integração Brevo (Fase 2) para sincronizar automaticamente'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!connection?.connected && (
            <button className="px-4 py-2 rounded-lg font-sans font-semibold text-sm border border-areia-warm text-gray-600 hover:bg-areia">
              Conectar Brevo
            </button>
          )}
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid"
          >
            <Plus size={16} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Assinantes */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard icon={Users} label="Total de inscritos" value={latestStats ? formatNumber(latestStats.total_subscribers) : '—'} />
        <KPICard icon={UserPlus} label="Novos este mês" value={latestStats ? formatNumber(latestStats.new_subscribers) : '—'} />
        <KPICard icon={UserMinus} label="Cancelamentos" value={latestStats ? formatNumber(latestStats.unsubscribes) : '—'} />
      </div>

      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-3">Crescimento de Inscritos</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={50} />
            <Tooltip formatter={(v: number) => formatNumber(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }} />
            <Line type="monotone" dataKey="total" name="Inscritos" stroke="#6BB42E" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Campanhas (Brevo) */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-serif text-lg text-gray-900">Campanhas enviadas (Brevo)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-4 py-1.5">Nome</th>
                <th className="px-4 py-1.5">Data de envio</th>
                <th className="px-4 py-1.5 text-right">Taxa de abertura</th>
                <th className="px-4 py-1.5 text-right">Taxa de clique</th>
              </tr>
            </thead>
            <tbody>
              {!campaigns || campaigns.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhuma campanha encontrada na Brevo — verifique a api-key em Configurações.</td></tr>
              ) : campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-1.5 text-gray-800 font-semibold">{c.name}</td>
                  <td className="px-4 py-1.5 text-gray-500">{c.sentDate ? formatDate(c.sentDate.slice(0, 10)) : '—'}</td>
                  <td className="px-4 py-1.5 text-right font-bold text-gray-900">{formatPercent(c.openRate)}</td>
                  <td className="px-4 py-1.5 text-right font-bold text-gray-900">{formatPercent(c.clickRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automações */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-serif text-lg text-gray-900">Automações</p>
        </div>
        <div className="divide-y divide-gray-50">
          {!automations || automations.length === 0 ? (
            <p className="font-sans text-sm text-gray-400 px-5 py-4">Nenhuma automação configurada.</p>
          ) : automations.map((a) => (
            <div key={a.id} className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${a.status === 'ativo' ? 'bg-verde-pale' : 'bg-gray-100'}`}>
                  <Zap size={14} className={a.status === 'ativo' ? 'text-verde-vivid' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="font-sans font-semibold text-sm text-gray-800">{a.name}</p>
                  <p className="font-sans text-xs text-gray-400">{TRIGGER_TYPE_LABELS[a.trigger_type]}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 font-sans text-sm">
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Enviados</p>
                  <p className="font-semibold text-gray-700">{formatNumber(a.sent_count)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Abertura</p>
                  <p className="font-semibold text-gray-700">{a.open_rate != null ? formatPercent(a.open_rate) : '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Clique</p>
                  <p className="font-semibold text-gray-700">{a.click_rate != null ? formatPercent(a.click_rate) : '—'}</p>
                </div>
                <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${a.status === 'ativo' ? 'bg-verde-pale text-verde-vivid' : 'bg-gray-100 text-gray-500'}`}>
                  {a.status === 'ativo' ? 'Ativo' : 'Pausado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CampaignBuilderModal open={showBuilder} onClose={() => setShowBuilder(false)} />
    </div>
  )
}
