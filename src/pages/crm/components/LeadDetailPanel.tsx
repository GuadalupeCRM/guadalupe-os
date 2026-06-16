import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  X, Phone, Mail, Instagram, MapPin, Building2, Plus, Bot,
  MessageCircle, FileText, Users as UsersIcon, ShoppingCart, Calendar, AlertTriangle,
} from 'lucide-react'
import { CHANNEL_LABELS, CRM_STAGE_LABELS } from '../../../constants/business'
import { CANAL_BADGE, ACTIVITY_TYPE_LABELS, initials } from '../constants'
import { formatNumber, formatCurrency } from '../../../utils/formatters'
import { useLead, useUpdateLead, useCreateActivity, useMarkLeadLost, useProfiles, useConvertLeadToPDV } from '../../../hooks/useCRM'
import { useAuth } from '../../../hooks/useAuth'
import type { CRMStage } from '../../../types'

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  visita: MapPin,
  reuniao: UsersIcon,
  proposta_enviada: FileText,
  pedido: ShoppingCart,
  outro: Calendar,
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function AddActivityForm({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const { profile } = useAuth()
  const [activityType, setActivityType] = useState('ligacao')
  const [description, setDescription] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const createActivity = useCreateActivity()

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Descreva a atividade')
      return
    }
    try {
      await createActivity.mutateAsync({
        lead_id: leadId,
        user_id: profile?.id,
        activity_type: activityType,
        description,
        next_action_date: nextActionDate || undefined,
      })
      toast.success('Atividade registrada')
      setDescription('')
      setNextActionDate('')
      onDone()
    } catch {
      toast.error('Erro ao registrar atividade')
    }
  }

  return (
    <div className="bg-areia border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid">
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid" />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Descreva o que aconteceu..."
        className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold text-gray-500 hover:bg-white">Cancelar</button>
        <button onClick={handleSubmit} disabled={createActivity.isPending} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
          {createActivity.isPending ? 'Salvando...' : 'Registrar'}
        </button>
      </div>
    </div>
  )
}

export default function LeadDetailPanel({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { data, isLoading } = useLead(leadId)
  const { data: profiles } = useProfiles()
  const updateLead = useUpdateLead()
  const markLost = useMarkLeadLost()
  const convertToPDV = useConvertLeadToPDV()
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [showLostForm, setShowLostForm] = useState(false)

  const assignedProfile = profiles?.find((p) => p.id === data?.lead.assigned_to)

  const handleStageChange = async (newStage: CRMStage) => {
    if (!data) return
    if (!confirm(`Mover lead para "${CRM_STAGE_LABELS[newStage]}"?`)) return
    try {
      await updateLead.mutateAsync({ id: data.lead.id, stage: newStage })
      toast.success('Estágio atualizado')
    } catch {
      toast.error('Erro ao atualizar estágio')
    }
  }

  const handleMarkLost = async () => {
    if (!data || !lostReason.trim()) {
      toast.error('Informe o motivo')
      return
    }
    try {
      await markLost.mutateAsync({ id: data.lead.id, reason: lostReason })
      toast.success('Lead marcado como perdido')
      setShowLostForm(false)
      onClose()
    } catch {
      toast.error('Erro ao atualizar lead')
    }
  }

  const handleConvertToPDV = async () => {
    if (!data) return
    try {
      await convertToPDV.mutateAsync(data.lead)
      toast.success('Lead convertido em PDV')
    } catch {
      toast.error('Erro ao converter lead')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg h-full overflow-y-auto shadow-xl">
        {isLoading || !data ? (
          <p className="font-sans text-sm text-gray-400 p-5">Carregando lead...</p>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl text-gray-900 truncate">{data.lead.business_name || data.lead.name}</h2>
                  <p className="font-sans text-sm text-gray-500">{data.lead.name}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {data.lead.canal && (
                  <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CANAL_BADGE[data.lead.canal] ?? 'bg-gray-100 text-gray-500'}`}>
                    {CHANNEL_LABELS[data.lead.canal] ?? data.lead.canal}
                  </span>
                )}
                <select
                  value={data.lead.stage}
                  onChange={(e) => handleStageChange(e.target.value as CRMStage)}
                  className="border border-areia-warm rounded-lg px-2 py-1 font-sans text-xs font-semibold bg-white focus:outline-none focus:border-verde-vivid text-gray-700"
                >
                  {Object.entries(CRM_STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Contato */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Contato</p>
                <div className="space-y-1.5">
                  {data.lead.phone && (
                    <div className="flex items-center gap-2 font-sans text-sm">
                      <Phone size={14} className="text-gray-400" />
                      <a href={`tel:${data.lead.phone}`} className="text-gray-700 hover:text-verde-vivid">{data.lead.phone}</a>
                      <a href={`https://wa.me/55${data.lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-verde-vivid hover:underline text-xs font-semibold ml-1">
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {data.lead.email && (
                    <div className="flex items-center gap-2 font-sans text-sm">
                      <Mail size={14} className="text-gray-400" />
                      <a href={`mailto:${data.lead.email}`} className="text-gray-700 hover:text-verde-vivid">{data.lead.email}</a>
                    </div>
                  )}
                  {data.lead.instagram && (
                    <div className="flex items-center gap-2 font-sans text-sm">
                      <Instagram size={14} className="text-gray-400" />
                      <span className="text-gray-700">{data.lead.instagram}</span>
                    </div>
                  )}
                  {data.lead.cnpj && (
                    <div className="flex items-center gap-2 font-sans text-sm">
                      <Building2 size={14} className="text-gray-400" />
                      <span className="text-gray-700">{data.lead.cnpj}</span>
                    </div>
                  )}
                  {(data.lead.address || data.lead.neighborhood || data.lead.city) && (
                    <div className="flex items-center gap-2 font-sans text-sm">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="text-gray-700">{[data.lead.address, data.lead.neighborhood, data.lead.city].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pipeline */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Pipeline</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Origem</p>
                    <p className="font-sans text-sm font-semibold text-gray-800">{data.lead.origin}</p>
                  </div>
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Responsável</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-5 h-5 rounded-full bg-verde-vivid text-white text-[10px] font-bold flex items-center justify-center">
                        {assignedProfile ? initials(assignedProfile.full_name) : '—'}
                      </span>
                      <p className="font-sans text-sm font-semibold text-gray-800">{assignedProfile?.full_name ?? 'Sem responsável'}</p>
                    </div>
                  </div>
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Estimativa mensal</p>
                    <p className="font-sans text-sm font-semibold text-gray-800">
                      {data.lead.estimated_monthly_units ? `${formatNumber(data.lead.estimated_monthly_units)} latas` : '—'}
                    </p>
                  </div>
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Receita estimada</p>
                    <p className="font-sans text-sm font-semibold text-gray-800">
                      {data.lead.estimated_monthly_revenue ? formatCurrency(data.lead.estimated_monthly_revenue) : '—'}
                    </p>
                  </div>
                </div>
                {data.lead.notes && (
                  <p className="font-sans text-xs text-gray-500 mt-2 italic bg-areia rounded-lg p-3">{data.lead.notes}</p>
                )}
              </div>

              {/* Ações de estágio */}
              <div className="flex flex-wrap gap-2">
                {data.lead.stage === 'qualificado' && (
                  <button onClick={() => handleStageChange('proposta_enviada')} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-amarelo-vivid text-white hover:opacity-90">
                    Enviar Proposta
                  </button>
                )}
                {data.lead.stage === 'negociacao' && (
                  <button onClick={() => handleStageChange('primeiro_pedido')} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-verde-vivid text-white hover:bg-verde-mid">
                    Registrar Pedido
                  </button>
                )}
                {(data.lead.stage === 'primeiro_pedido' || data.lead.stage === 'ativo') && (
                  <button onClick={handleConvertToPDV} disabled={convertToPDV.isPending} className="px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-verde-pale text-verde-vivid hover:bg-verde-mid hover:text-white disabled:opacity-50">
                    Converter em PDV
                  </button>
                )}
              </div>

              {/* Insights do agente */}
              {data.insights.length > 0 && (
                <div>
                  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Insights do Agente</p>
                  <div className="space-y-2">
                    {data.insights.map((insight) => (
                      <div key={insight.id} className="bg-verde-pale border border-verde-mid rounded-xl p-3 flex items-start gap-2">
                        <div className="w-7 h-7 bg-verde-vivid rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot size={12} className="text-white" />
                        </div>
                        <div>
                          <p className="font-sans font-semibold text-xs text-verde-vivid">{insight.title}</p>
                          <p className="font-sans text-xs text-gray-600 mt-0.5">{insight.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline de atividades */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Atividades</p>
                  <button onClick={() => setShowActivityForm((v) => !v)} className="flex items-center gap-1 text-verde-vivid hover:text-verde-mid">
                    <Plus size={14} />
                    <span className="font-sans text-xs font-semibold">Adicionar</span>
                  </button>
                </div>

                {showActivityForm && (
                  <div className="mb-3">
                    <AddActivityForm leadId={data.lead.id} onDone={() => setShowActivityForm(false)} />
                  </div>
                )}

                {data.activities.length === 0 ? (
                  <p className="font-sans text-xs text-gray-400">Nenhuma atividade registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {data.activities.map((a) => {
                      const Icon = ACTIVITY_ICONS[a.activity_type] ?? Calendar
                      const userProfile = profiles?.find((p) => p.id === a.user_id)
                      return (
                        <div key={a.id} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-areia flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon size={13} className="text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-sans text-xs font-semibold text-gray-700">{ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type}</p>
                              <p className="font-sans text-[11px] text-gray-400 flex-shrink-0">{formatDateTime(a.created_at)}</p>
                            </div>
                            <p className="font-sans text-sm text-gray-600 mt-0.5">{a.description}</p>
                            {a.next_action && <p className="font-sans text-xs text-gray-400 mt-0.5">Próxima ação: {a.next_action}</p>}
                            {userProfile && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-4 h-4 rounded-full bg-verde-pale text-verde-vivid text-[9px] font-bold flex items-center justify-center">
                                  {initials(userProfile.full_name)}
                                </span>
                                <p className="font-sans text-[11px] text-gray-400">{userProfile.full_name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Danger zone */}
              {data.lead.stage !== 'perdido' && (
                <div className="border border-rosa-vivid/30 rounded-xl p-4">
                  {!showLostForm ? (
                    <button onClick={() => setShowLostForm(true)} className="flex items-center gap-2 font-sans text-xs font-semibold text-rosa-vivid hover:text-rosa-mid">
                      <AlertTriangle size={14} /> Marcar como perdido
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-sans text-xs font-semibold text-rosa-vivid">Motivo da perda</p>
                      <textarea
                        value={lostReason}
                        onChange={(e) => setLostReason(e.target.value)}
                        rows={2}
                        className="w-full border border-rosa-vivid/30 rounded-lg px-2 py-1.5 font-sans text-xs focus:outline-none focus:border-rosa-vivid"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowLostForm(false)} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleMarkLost} disabled={markLost.isPending} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {data.lead.lost_reason && (
                <div className="bg-rosa-pale border border-rosa-vivid rounded-xl p-3">
                  <p className="font-sans text-xs font-semibold text-rosa-vivid">Motivo da perda</p>
                  <p className="font-sans text-xs text-gray-600 mt-0.5">{data.lead.lost_reason}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
