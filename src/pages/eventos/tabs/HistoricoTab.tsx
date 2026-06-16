import { useState } from 'react'
import { Download } from 'lucide-react'
import { EVENT_STAGE_LABELS } from '../../../constants/business'
import { STAGE_BADGE, EVENT_TYPE_LABELS } from '../constants'
import { formatCurrency } from '../../../utils/formatters'
import { useEvents } from '../../../hooks/useEventos'
import EventDetailPanel from '../components/EventDetailPanel'

const HISTORY_STAGES = ['finalizado', 'cancelado']

function exportCSV(events: ReturnType<typeof useEvents>['data']) {
  if (!events || events.length === 0) return
  const header = ['Nome', 'Data', 'Tipo', 'Receita', 'Custo', 'Margem', 'UGCs', 'Status']
  const rows = events.map((e) => [
    e.name,
    e.event_date ?? '',
    EVENT_TYPE_LABELS[e.event_type ?? ''] ?? e.event_type ?? '',
    String(e.actual_revenue ?? e.estimated_revenue ?? 0),
    String(e.total_cost ?? 0),
    String(e.net_margin ?? ''),
    String(e.ugc_count ?? 0),
    EVENT_STAGE_LABELS[e.stage] ?? e.stage,
  ])
  const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `eventos_historico_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoricoTab() {
  const { data: events, isLoading } = useEvents()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const history = (events ?? []).filter((e) => HISTORY_STAGES.includes(e.stage))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => exportCSV(history)}
          disabled={history.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm border border-areia-warm text-gray-600 hover:bg-areia disabled:opacity-50"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando histórico...</p>
      ) : history.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-sans text-gray-400">Nenhum evento no histórico.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-2.5">Nome</th>
                  <th className="px-5 py-2.5">Data</th>
                  <th className="px-5 py-2.5">Tipo</th>
                  <th className="px-5 py-2.5 text-right">Receita</th>
                  <th className="px-5 py-2.5 text-right">Custo</th>
                  <th className="px-5 py-2.5 text-right">Margem</th>
                  <th className="px-5 py-2.5 text-right">UGCs</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((event) => (
                  <tr key={event.id} onClick={() => setSelectedEventId(event.id)} className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-areia/50">
                    <td className="px-5 py-2.5 text-gray-800 font-semibold">{event.name}</td>
                    <td className="px-5 py-2.5 text-gray-500">{event.event_date ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-5 py-2.5 text-gray-500">{EVENT_TYPE_LABELS[event.event_type ?? ''] ?? event.event_type ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700">{formatCurrency(event.actual_revenue ?? event.estimated_revenue ?? 0)}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700">{formatCurrency(event.total_cost ?? 0)}</td>
                    <td className={`px-5 py-2.5 text-right font-semibold ${(event.net_margin ?? 0) >= 0 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
                      {event.net_margin !== undefined && event.net_margin !== null ? formatCurrency(event.net_margin) : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-500">{event.ugc_count ?? 0}</td>
                    <td className="px-5 py-2.5">
                      <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[event.stage]}`}>
                        {EVENT_STAGE_LABELS[event.stage]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedEventId && <EventDetailPanel eventId={selectedEventId} onClose={() => setSelectedEventId(null)} readOnly />}
    </div>
  )
}
