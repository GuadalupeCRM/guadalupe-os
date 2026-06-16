import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, MapPin, Phone, Calendar, FileText, Plus, Clock } from 'lucide-react'
import { EVENT_STAGE_LABELS } from '../../../constants/business'
import { EVENT_TYPE_LABELS, STAGE_BADGE } from '../constants'
import { formatCurrency, formatNumber } from '../../../utils/formatters'
import { useEvent, useUpdateEvent } from '../../../hooks/useEventos'
import type { EventStage } from '../../../types'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EventDetailPanel({ eventId, onClose, readOnly = false }: { eventId: string; onClose: () => void; readOnly?: boolean }) {
  const { data: event, isLoading } = useEvent(eventId)
  const updateEvent = useUpdateEvent()

  const [costs, setCosts] = useState<{ labor: string; materials: string; freight: string; rent: string; other: string } | null>(null)
  const [metrics, setMetrics] = useState<{ actual_units_sold: string; actual_revenue: string; ugc_count: string; instagram_tags: string; videos_count: string } | null>(null)
  const [nfInput, setNfInput] = useState('')

  if (!costs && event) {
    setCosts({
      labor: String(event.cost_labor ?? 0),
      materials: String(event.cost_materials ?? 0),
      freight: String(event.cost_freight ?? 0),
      rent: String(event.cost_rent ?? 0),
      other: String(event.cost_other ?? 0),
    })
  }
  if (!metrics && event) {
    setMetrics({
      actual_units_sold: String(event.actual_units_sold ?? ''),
      actual_revenue: String(event.actual_revenue ?? ''),
      ugc_count: String(event.ugc_count ?? 0),
      instagram_tags: String(event.instagram_tags ?? 0),
      videos_count: String(event.videos_count ?? 0),
    })
  }

  const handleStageChange = async (newStage: EventStage) => {
    if (!confirm(`Mover evento para "${EVENT_STAGE_LABELS[newStage]}"?`)) return
    try {
      await updateEvent.mutateAsync({ id: eventId, stage: newStage })
      toast.success('Estágio atualizado')
    } catch {
      toast.error('Erro ao atualizar estágio')
    }
  }

  const handleToggleChecklist = async (index: number) => {
    if (!event) return
    const checklist = event.checklist.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
    try {
      await updateEvent.mutateAsync({ id: eventId, checklist })
    } catch {
      toast.error('Erro ao atualizar checklist')
    }
  }

  const handleSaveFinancials = async () => {
    if (!costs || !event) return
    const cost_labor = Number(costs.labor) || 0
    const cost_materials = Number(costs.materials) || 0
    const cost_freight = Number(costs.freight) || 0
    const cost_rent = Number(costs.rent) || 0
    const cost_other = Number(costs.other) || 0
    const total_cost = cost_labor + cost_materials + cost_freight + cost_rent + cost_other
    const revenue = event.actual_revenue ?? event.estimated_revenue ?? 0
    const net_margin = revenue - total_cost
    try {
      await updateEvent.mutateAsync({ id: eventId, cost_labor, cost_materials, cost_freight, cost_rent, cost_other, total_cost, net_margin })
      toast.success('Financeiro atualizado')
    } catch {
      toast.error('Erro ao salvar financeiro')
    }
  }

  const handleSaveMetrics = async () => {
    if (!metrics || !event) return
    const actual_units_sold = metrics.actual_units_sold ? Number(metrics.actual_units_sold) : undefined
    const actual_revenue = metrics.actual_revenue ? Number(metrics.actual_revenue) : undefined
    const ugc_count = Number(metrics.ugc_count) || 0
    const instagram_tags = Number(metrics.instagram_tags) || 0
    const videos_count = Number(metrics.videos_count) || 0
    const total_cost = event.total_cost ?? 0
    const net_margin = (actual_revenue ?? event.estimated_revenue ?? 0) - total_cost
    try {
      await updateEvent.mutateAsync({ id: eventId, actual_units_sold, actual_revenue, ugc_count, instagram_tags, videos_count, net_margin })
      toast.success('Métricas atualizadas')
    } catch {
      toast.error('Erro ao salvar métricas')
    }
  }

  const handleAddNF = async () => {
    if (!event || !nfInput.trim()) return
    const nf_numbers = [...(event.nf_numbers ?? []), nfInput.trim()]
    try {
      await updateEvent.mutateAsync({ id: eventId, nf_numbers })
      setNfInput('')
      toast.success('NF adicionada')
    } catch {
      toast.error('Erro ao adicionar NF')
    }
  }

  const totalCostPreview = costs
    ? (Number(costs.labor) || 0) + (Number(costs.materials) || 0) + (Number(costs.freight) || 0) + (Number(costs.rent) || 0) + (Number(costs.other) || 0)
    : 0
  const revenuePreview = event ? (event.actual_revenue ?? event.estimated_revenue ?? 0) : 0
  const marginPreview = revenuePreview - totalCostPreview

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl h-full overflow-y-auto shadow-xl">
        {isLoading || !event ? (
          <p className="font-sans text-sm text-gray-400 p-5">Carregando evento...</p>
        ) : (
          <>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl text-gray-900 truncate">{event.name}</h2>
                  <p className="font-sans text-sm text-gray-500 flex items-center gap-3 mt-0.5">
                    {event.event_date && <span className="flex items-center gap-1"><Calendar size={12} />{new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                    {event.venue && <span className="flex items-center gap-1"><MapPin size={12} />{event.venue}</span>}
                  </p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {event.event_type && (
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-areia text-gray-500">
                    {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                  </span>
                )}
                {readOnly ? (
                  <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[event.stage]}`}>
                    {EVENT_STAGE_LABELS[event.stage]}
                  </span>
                ) : (
                  <select
                    value={event.stage}
                    onChange={(e) => handleStageChange(e.target.value as EventStage)}
                    className={`font-sans text-xs font-bold px-2 py-1 rounded-full border-0 focus:outline-none ${STAGE_BADGE[event.stage]}`}
                  >
                    {Object.entries(EVENT_STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Contato */}
              {(event.contact_name || event.contact_phone || event.address) && (
                <div className="space-y-1.5">
                  {event.contact_name && <p className="font-sans text-sm text-gray-700">{event.contact_name}</p>}
                  {event.contact_phone && (
                    <div className="flex items-center gap-2 font-sans text-sm">
                      <Phone size={14} className="text-gray-400" />
                      <a href={`tel:${event.contact_phone}`} className="text-gray-700 hover:text-verde-vivid">{event.contact_phone}</a>
                    </div>
                  )}
                  {event.address && (
                    <div className="flex items-center gap-2 font-sans text-sm">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="text-gray-700">{event.address}, {event.city}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Financeiro */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Financeiro</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Receita estimada</p>
                    <p className="font-serif text-lg text-gray-900">{event.estimated_revenue ? formatCurrency(event.estimated_revenue) : '—'}</p>
                  </div>
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Receita real</p>
                    <p className="font-serif text-lg text-gray-900">{event.actual_revenue ? formatCurrency(event.actual_revenue) : '—'}</p>
                  </div>
                </div>
                {costs && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {([
                      ['labor', 'Mão de obra'],
                      ['materials', 'Materiais'],
                      ['freight', 'Frete'],
                      ['rent', 'Aluguel/Espaço'],
                      ['other', 'Outros'],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className="block font-sans text-[11px] text-gray-400 mb-0.5">{label}</label>
                        <input
                          type="number"
                          step="0.01"
                          disabled={readOnly}
                          value={costs[key]}
                          onChange={(e) => setCosts({ ...costs, [key]: e.target.value })}
                          className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid disabled:bg-areia disabled:text-gray-400"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Custo total</p>
                    <p className="font-serif text-lg text-gray-900">{formatCurrency(totalCostPreview)}</p>
                  </div>
                  <div className="bg-areia rounded-lg p-3">
                    <p className="font-sans text-[11px] text-gray-400">Margem líquida</p>
                    <p className={`font-serif text-lg ${marginPreview >= 0 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>{formatCurrency(marginPreview)}</p>
                  </div>
                </div>
                {!readOnly && (
                  <button onClick={handleSaveFinancials} disabled={updateEvent.isPending} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
                    Salvar Financeiro
                  </button>
                )}
              </div>

              {/* Checklist operacional */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Checklist Operacional</p>
                <div className="space-y-1.5">
                  {event.checklist.map((item, i) => (
                    <label key={i} className="flex items-center gap-2 font-sans text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={item.done} disabled={readOnly} onChange={() => handleToggleChecklist(i)} />
                      <span className={item.done ? 'line-through text-gray-400' : ''}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Métricas pós-evento */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Métricas Pós-Evento</p>
                {metrics && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block font-sans text-[11px] text-gray-400 mb-0.5">Unidades vendidas</label>
                      <input type="number" disabled={readOnly} value={metrics.actual_units_sold} onChange={(e) => setMetrics({ ...metrics, actual_units_sold: e.target.value })} className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid disabled:bg-areia disabled:text-gray-400" />
                    </div>
                    <div>
                      <label className="block font-sans text-[11px] text-gray-400 mb-0.5">Receita real (R$)</label>
                      <input type="number" step="0.01" disabled={readOnly} value={metrics.actual_revenue} onChange={(e) => setMetrics({ ...metrics, actual_revenue: e.target.value })} className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid disabled:bg-areia disabled:text-gray-400" />
                    </div>
                    <div>
                      <label className="block font-sans text-[11px] text-gray-400 mb-0.5">UGCs</label>
                      <input type="number" disabled={readOnly} value={metrics.ugc_count} onChange={(e) => setMetrics({ ...metrics, ugc_count: e.target.value })} className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid disabled:bg-areia disabled:text-gray-400" />
                    </div>
                    <div>
                      <label className="block font-sans text-[11px] text-gray-400 mb-0.5">Marcações no Instagram</label>
                      <input type="number" disabled={readOnly} value={metrics.instagram_tags} onChange={(e) => setMetrics({ ...metrics, instagram_tags: e.target.value })} className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid disabled:bg-areia disabled:text-gray-400" />
                    </div>
                    <div>
                      <label className="block font-sans text-[11px] text-gray-400 mb-0.5">Vídeos</label>
                      <input type="number" disabled={readOnly} value={metrics.videos_count} onChange={(e) => setMetrics({ ...metrics, videos_count: e.target.value })} className="w-full border border-areia-warm rounded-lg px-2 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid disabled:bg-areia disabled:text-gray-400" />
                    </div>
                  </div>
                )}
                {!readOnly && (
                  <button onClick={handleSaveMetrics} disabled={updateEvent.isPending} className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
                    Salvar Métricas
                  </button>
                )}
              </div>

              {/* NFs Bling */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1"><FileText size={12} /> Notas Fiscais (Bling)</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(event.nf_numbers ?? []).length === 0 ? (
                    <p className="font-sans text-xs text-gray-400">Nenhuma NF registrada.</p>
                  ) : (event.nf_numbers ?? []).map((nf) => (
                    <span key={nf} className="font-sans text-xs bg-areia rounded-full px-2 py-0.5 text-gray-600">{nf}</span>
                  ))}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <input value={nfInput} onChange={(e) => setNfInput(e.target.value)} placeholder="Número da NF" className="flex-1 border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
                    <button onClick={handleAddNF} className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid">
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>
                )}
              </div>

              {/* Linha do tempo de estágios */}
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1"><Clock size={12} /> Histórico de Estágios</p>
                <div className="space-y-2">
                  {(event.stage_history ?? []).slice().reverse().map((h, i) => (
                    <div key={i} className="flex items-center justify-between font-sans text-sm">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[h.stage]}`}>
                        {EVENT_STAGE_LABELS[h.stage] ?? h.stage}
                      </span>
                      <span className="text-gray-400 text-xs">{formatDateTime(h.changed_at)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {event.estimated_attendees && (
                <p className="font-sans text-xs text-gray-400">Estimativa de presença: {formatNumber(event.estimated_attendees)} pessoas</p>
              )}
              {event.notes && <p className="font-sans text-xs text-gray-500 italic bg-areia rounded-lg p-3">{event.notes}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
