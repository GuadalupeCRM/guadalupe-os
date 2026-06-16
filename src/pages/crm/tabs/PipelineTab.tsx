import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { LayoutGrid, List, Plus, Search, AlertCircle } from 'lucide-react'
import { CHANNEL_LABELS, CRM_STAGE_LABELS, LEAD_ALERT_HOURS } from '../../../constants/business'
import { CANAL_BADGE, STAGE_BADGE, STAGE_ORDER, ORIGIN_OPTIONS, initials } from '../constants'
import { formatCurrency } from '../../../utils/formatters'
import { useLeads, useUpdateLead, useProfiles } from '../../../hooks/useCRM'
import LeadForm from '../components/LeadForm'
import LeadDetailPanel from '../components/LeadDetailPanel'
import type { Lead, CRMStage } from '../../../types'

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

function formatRelativeDate(iso: string): string {
  const h = hoursSince(iso)
  if (h < 1) return 'agora'
  if (h < 24) return `${Math.floor(h)}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function LeadCard({ lead, onClick, assignedName }: { lead: Lead; onClick: () => void; assignedName?: string }) {
  const isStale = hoursSince(lead.last_activity_at) > LEAD_ALERT_HOURS
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', lead.id)}
      onClick={onClick}
      className="bg-white border border-areia-warm rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-sans font-semibold text-sm text-gray-800 leading-tight truncate">{lead.business_name || lead.name}</p>
        {isStale && <AlertCircle size={14} className="text-rosa-vivid flex-shrink-0 mt-0.5" />}
      </div>
      <p className="font-sans text-xs text-gray-400 mb-2 truncate">{lead.name}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {lead.canal && (
            <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CANAL_BADGE[lead.canal] ?? 'bg-gray-100 text-gray-500'}`}>
              {CHANNEL_LABELS[lead.canal] ?? lead.canal}
            </span>
          )}
        </div>
        {assignedName && (
          <span className="w-5 h-5 rounded-full bg-verde-vivid text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" title={assignedName}>
            {initials(assignedName)}
          </span>
        )}
      </div>
      <p className={`font-sans text-[11px] mt-1.5 ${isStale ? 'text-rosa-vivid font-semibold' : 'text-gray-400'}`}>
        {formatRelativeDate(lead.last_activity_at)}
      </p>
    </div>
  )
}

export default function PipelineTab() {
  const [view, setView] = useState<'kanban' | 'lista'>('kanban')
  const [search, setSearch] = useState('')
  const [canal, setCanal] = useState('')
  const [origin, setOrigin] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [semAtividade, setSemAtividade] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  useEffect(() => {
    if (window.innerWidth < 768) setView('lista')
  }, [])

  const { data: leads, isLoading } = useLeads({
    search: search || undefined,
    canal: canal || undefined,
    origin: origin || undefined,
    assigned_to: assignedTo || undefined,
    semAtividade: semAtividade || undefined,
  })
  const { data: profiles } = useProfiles()
  const updateLead = useUpdateLead()

  const profileMap = useMemo(() => new Map((profiles ?? []).map((p) => [p.id, p.full_name])), [profiles])

  const leadsByStage = useMemo(() => {
    const map = new Map<string, Lead[]>()
    STAGE_ORDER.forEach((s) => map.set(s, []))
    ;(leads ?? []).forEach((l) => {
      const list = map.get(l.stage) ?? []
      list.push(l)
      map.set(l.stage, list)
    })
    return map
  }, [leads])

  const handleDrop = async (e: React.DragEvent, stage: CRMStage) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('text/plain')
    if (!leadId) return
    try {
      await updateLead.mutateAsync({ id: leadId, stage })
      toast.success(`Movido para ${CRM_STAGE_LABELS[stage]}`)
    } catch {
      toast.error('Erro ao mover lead')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lead, empresa, telefone..."
              className="pl-9 pr-3 py-2 border border-areia-warm rounded-lg font-sans text-sm bg-white focus:outline-none focus:border-verde-vivid w-56"
            />
          </div>
          <div className="flex gap-1 bg-areia rounded-lg p-1">
            <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md ${view === 'kanban' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('lista')} className={`p-1.5 rounded-md ${view === 'lista' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>
              <List size={16} />
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowLeadForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid"
        >
          <Plus size={16} /> Novo Lead
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <select value={canal} onChange={(e) => setCanal(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600">
          <option value="">Todos canais</option>
          {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600">
          <option value="">Todas origens</option>
          {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600">
          <option value="">Todos responsáveis</option>
          {(profiles ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <button
          onClick={() => setSemAtividade((v) => !v)}
          className={`font-sans text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
            semAtividade ? 'bg-rosa-vivid text-white' : 'bg-rosa-pale text-rosa-vivid opacity-70 hover:opacity-100'
          }`}
        >
          Sem atividade {'>'}24h
        </button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando pipeline...</p>
      ) : view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGE_ORDER.map((stage) => {
            const stageLeads = leadsByStage.get(stage) ?? []
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage)}
                className="bg-areia rounded-xl p-2 w-64 flex-shrink-0 flex flex-col max-h-[calc(100vh-320px)]"
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[stage]}`}>
                    {CRM_STAGE_LABELS[stage]}
                  </span>
                  <span className="font-sans text-xs font-bold text-gray-400">{stageLeads.length}</span>
                </div>
                <div className="space-y-2 overflow-y-auto px-1 pb-1">
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLeadId(lead.id)}
                      assignedName={lead.assigned_to ? profileMap.get(lead.assigned_to) : undefined}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-2.5">Nome / Empresa</th>
                  <th className="px-5 py-2.5">Canal</th>
                  <th className="px-5 py-2.5">Estágio</th>
                  <th className="px-5 py-2.5">Responsável</th>
                  <th className="px-5 py-2.5">Última atividade</th>
                  <th className="px-5 py-2.5 text-right">Previsão de receita</th>
                </tr>
              </thead>
              <tbody>
                {(leads ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Nenhum lead encontrado.</td></tr>
                ) : (leads ?? []).map((lead) => {
                  const isStale = hoursSince(lead.last_activity_at) > LEAD_ALERT_HOURS
                  return (
                    <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-areia/50">
                      <td className="px-5 py-2.5">
                        <p className="text-gray-800 font-semibold">{lead.business_name || lead.name}</p>
                        <p className="text-gray-400 text-xs">{lead.name}</p>
                      </td>
                      <td className="px-5 py-2.5">
                        {lead.canal && (
                          <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CANAL_BADGE[lead.canal] ?? 'bg-gray-100 text-gray-500'}`}>
                            {CHANNEL_LABELS[lead.canal] ?? lead.canal}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[lead.stage]}`}>
                          {CRM_STAGE_LABELS[lead.stage]}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">{lead.assigned_to ? profileMap.get(lead.assigned_to) : '—'}</td>
                      <td className={`px-5 py-2.5 ${isStale ? 'text-rosa-vivid font-semibold' : 'text-gray-500'}`}>{formatRelativeDate(lead.last_activity_at)}</td>
                      <td className="px-5 py-2.5 text-right text-gray-700">{lead.estimated_monthly_revenue ? formatCurrency(lead.estimated_monthly_revenue) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LeadForm open={showLeadForm} onClose={() => setShowLeadForm(false)} />
      {selectedLeadId && <LeadDetailPanel leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />}
    </div>
  )
}
