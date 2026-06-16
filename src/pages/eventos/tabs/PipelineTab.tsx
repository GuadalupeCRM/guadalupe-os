import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Calendar, MapPin, Users } from 'lucide-react'
import { EVENT_STAGE_LABELS } from '../../../constants/business'
import { PIPELINE_STAGE_ORDER, STAGE_BADGE, EVENT_TYPE_LABELS, initials } from '../constants'
import { formatCurrency, formatNumber } from '../../../utils/formatters'
import { useEvents, useUpdateEvent } from '../../../hooks/useEventos'
import { useProfiles } from '../../../hooks/useCRM'
import EventForm from '../components/EventForm'
import EventDetailPanel from '../components/EventDetailPanel'
import type { Event, EventStage } from '../../../types'

function EventCard({ event, onClick, onMove, assignedName }: { event: Event; onClick: () => void; onMove: (stage: EventStage) => void; assignedName?: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', event.id)}
      onClick={onClick}
      className="bg-white border border-areia-warm rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <p className="font-sans font-semibold text-sm text-gray-800 leading-tight truncate mb-1">{event.name}</p>
      {event.venue && (
        <p className="font-sans text-xs text-gray-400 truncate flex items-center gap-1 mb-0.5">
          <MapPin size={11} /> {event.venue}
        </p>
      )}
      {event.event_date && (
        <p className="font-sans text-xs text-gray-400 flex items-center gap-1 mb-0.5">
          <Calendar size={11} /> {new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR')}
        </p>
      )}
      {event.estimated_attendees && (
        <p className="font-sans text-xs text-gray-400 flex items-center gap-1 mb-1.5">
          <Users size={11} /> {formatNumber(event.estimated_attendees)} pessoas
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {event.event_type && (
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-areia text-gray-500">
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </span>
          )}
        </div>
        {assignedName && (
          <span className="w-5 h-5 rounded-full bg-verde-vivid text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" title={assignedName}>
            {initials(assignedName)}
          </span>
        )}
      </div>
      {event.estimated_revenue && (
        <p className="font-sans text-xs font-semibold text-gray-700 mt-1.5">{formatCurrency(event.estimated_revenue)}</p>
      )}
      {/* Tap-to-move (mobile) */}
      <select
        value={event.stage}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onMove(e.target.value as EventStage)}
        className="w-full mt-2 font-sans text-[11px] border border-areia-warm rounded-lg px-2 py-1 focus:outline-none focus:border-verde-vivid sm:hidden"
      >
        {PIPELINE_STAGE_ORDER.map((s) => <option key={s} value={s}>{EVENT_STAGE_LABELS[s]}</option>)}
      </select>
    </div>
  )
}

export default function PipelineTab() {
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const { data: events, isLoading } = useEvents()
  const { data: profiles } = useProfiles()
  const updateEvent = useUpdateEvent()

  const profileMap = useMemo(() => new Map((profiles ?? []).map((p) => [p.id, p.full_name])), [profiles])

  const eventsByStage = useMemo(() => {
    const map = new Map<string, Event[]>()
    PIPELINE_STAGE_ORDER.forEach((s) => map.set(s, []))
    ;(events ?? []).forEach((e) => {
      if (!PIPELINE_STAGE_ORDER.includes(e.stage)) return
      const list = map.get(e.stage) ?? []
      list.push(e)
      map.set(e.stage, list)
    })
    return map
  }, [events])

  const handleMove = async (id: string, stage: EventStage) => {
    try {
      await updateEvent.mutateAsync({ id, stage })
      toast.success(`Movido para ${EVENT_STAGE_LABELS[stage]}`)
    } catch {
      toast.error('Erro ao mover evento')
    }
  }

  const handleDrop = async (e: React.DragEvent, stage: EventStage) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    await handleMove(id, stage)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowEventForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid"
        >
          <Plus size={16} /> Novo Evento
        </button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando pipeline...</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE_STAGE_ORDER.map((stage) => {
            const stageEvents = eventsByStage.get(stage) ?? []
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage)}
                className="bg-areia rounded-xl p-2 w-64 flex-shrink-0 flex flex-col max-h-[calc(100vh-280px)]"
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[stage]}`}>
                    {EVENT_STAGE_LABELS[stage]}
                  </span>
                  <span className="font-sans text-xs font-bold text-gray-400">{stageEvents.length}</span>
                </div>
                <div className="space-y-2 overflow-y-auto px-1 pb-1">
                  {stageEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => setSelectedEventId(event.id)}
                      onMove={(s) => handleMove(event.id, s)}
                      assignedName={event.assigned_to ? profileMap.get(event.assigned_to) : undefined}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EventForm open={showEventForm} onClose={() => setShowEventForm(false)} />
      {selectedEventId && <EventDetailPanel eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />}
    </div>
  )
}
