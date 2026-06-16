import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Camera, Clock, MapPin, Plus, ShoppingCart } from 'lucide-react'
import { EVENT_STAGE_LABELS } from '../../../constants/business'
import { STAGE_BADGE, EVENT_TYPE_LABELS } from '../constants'
import { useEvents, useUpdateEvent } from '../../../hooks/useEventos'
import QuickSaleModal from '../components/QuickSaleModal'
import EventDetailPanel from '../components/EventDetailPanel'
import type { Event } from '../../../types'

const ACTIVE_WINDOW_DAYS = 3

function isActive(event: Event): boolean {
  if (!event.event_date) return false
  if (event.stage === 'finalizado' || event.stage === 'cancelado') return false
  const eventDate = new Date(event.event_date + 'T00:00:00')
  const now = new Date()
  const diffDays = Math.abs((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= ACTIVE_WINDOW_DAYS
}

function ElapsedTimer({ eventDate }: { eventDate: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const start = new Date(eventDate + 'T00:00:00').getTime()
  const diffMs = now - start
  if (diffMs < 0) return null

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <span className="flex items-center gap-1 font-sans text-xs font-semibold text-rosa-vivid">
      <Clock size={12} /> {hours}h{minutes.toString().padStart(2, '0')}min desde o início
    </span>
  )
}

function ActiveEventCard({ event }: { event: Event }) {
  const updateEvent = useUpdateEvent()
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const isToday = event.event_date === new Date().toISOString().slice(0, 10)

  const handleToggleChecklist = async (index: number) => {
    const checklist = event.checklist.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
    try {
      await updateEvent.mutateAsync({ id: event.id, checklist })
    } catch {
      toast.error('Erro ao atualizar checklist')
    }
  }

  const handleAddUGC = async () => {
    try {
      await updateEvent.mutateAsync({ id: event.id, ugc_count: (event.ugc_count ?? 0) + 1 })
    } catch {
      toast.error('Erro ao registrar UGC')
    }
  }

  const handleFinalizar = async () => {
    if (!confirm('Finalizar este evento? Ele será movido para o Histórico.')) return
    try {
      await updateEvent.mutateAsync({ id: event.id, stage: 'finalizado' })
      toast.success('Evento finalizado — preencha as métricas finais')
      setShowDetail(true)
    } catch {
      toast.error('Erro ao finalizar evento')
    }
  }

  const doneCount = event.checklist.filter((i) => i.done).length

  return (
    <div className="bg-white border border-areia-warm rounded-xl p-5 relative">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-serif text-xl text-gray-900">{event.name}</h3>
          <p className="font-sans text-xs text-gray-400 flex items-center gap-3 mt-0.5">
            {event.venue && <span className="flex items-center gap-1"><MapPin size={11} /> {event.venue}</span>}
            {event.event_date && <span>{new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
          </p>
        </div>
        <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${STAGE_BADGE[event.stage]}`}>
          {EVENT_STAGE_LABELS[event.stage]}
        </span>
      </div>

      {event.event_type && (
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-areia text-gray-500">
          {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
        </span>
      )}

      {isToday && event.event_date && (
        <div className="mt-2"><ElapsedTimer eventDate={event.event_date} /></div>
      )}

      {/* Checklist completo */}
      <div className="mt-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Checklist ({doneCount}/{event.checklist.length})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {event.checklist.map((item, i) => (
            <label key={i} className="flex items-center gap-2 font-sans text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={item.done} onChange={() => handleToggleChecklist(i)} />
              <span className={item.done ? 'line-through text-gray-400' : ''}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* UGCs */}
      <div className="flex items-center justify-between mt-4 bg-areia rounded-lg p-3">
        <p className="font-sans text-sm text-gray-700">UGCs registrados: <span className="font-bold">{event.ugc_count ?? 0}</span></p>
        <button onClick={handleAddUGC} className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid">
          <Camera size={12} /> <Plus size={12} />
        </button>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => setShowSaleModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-amarelo-vivid text-white hover:opacity-90"
        >
          <ShoppingCart size={16} /> Registrar Venda
        </button>
        <button
          onClick={() => setShowDetail(true)}
          className="px-4 py-2 rounded-lg font-sans font-semibold text-sm border border-areia-warm text-gray-600 hover:bg-areia"
        >
          Ver Detalhes
        </button>
        <button
          onClick={handleFinalizar}
          className="ml-auto px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid"
        >
          Finalizar Evento
        </button>
      </div>

      {showSaleModal && <QuickSaleModal eventId={event.id} onClose={() => setShowSaleModal(false)} />}
      {showDetail && <EventDetailPanel eventId={event.id} onClose={() => setShowDetail(false)} />}
    </div>
  )
}

export default function EmExecucaoTab() {
  const { data: events, isLoading } = useEvents()

  const activeEvents = (events ?? []).filter(isActive)

  if (isLoading) {
    return <p className="font-sans text-sm text-gray-400">Carregando eventos...</p>
  }

  if (activeEvents.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-sans text-gray-400">Nenhum evento em execução nos próximos/últimos {ACTIVE_WINDOW_DAYS} dias.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activeEvents.map((event) => <ActiveEventCard key={event.id} event={event} />)}
    </div>
  )
}
