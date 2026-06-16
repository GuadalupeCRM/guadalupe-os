import { useState } from 'react'
import { Phone, MessageCircle, Mail, MapPin, Users as UsersIcon, FileText, ShoppingCart, Calendar } from 'lucide-react'
import { ACTIVITY_TYPE_LABELS, initials } from '../constants'
import { useActivityFeed, useProfiles } from '../../../hooks/useCRM'

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

export default function AtividadesTab() {
  const [userId, setUserId] = useState('')
  const [activityType, setActivityType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: profiles } = useProfiles()
  const { data: activities, isLoading } = useActivityFeed({
    userId: userId || undefined,
    activityType: activityType || undefined,
    startDate: startDate ? `${startDate}T00:00:00` : undefined,
    endDate: endDate ? `${endDate}T23:59:59` : undefined,
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600">
          <option value="">Todos usuários</option>
          {(profiles ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600">
          <option value="">Todos tipos</option>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600" />
        <span className="font-sans text-xs text-gray-400">até</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600" />
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando atividades...</p>
      ) : !activities || activities.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-sans text-gray-400">Nenhuma atividade encontrada.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-50">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.activity_type] ?? Calendar
            return (
              <div key={activity.id} className="flex items-start gap-3 p-4">
                <div className="w-8 h-8 rounded-full bg-areia flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-sans font-semibold text-sm text-gray-800">
                      {activity.lead_business_name ?? 'Lead'}
                      <span className="font-sans text-xs font-normal text-gray-400 ml-2">
                        {ACTIVITY_TYPE_LABELS[activity.activity_type] ?? activity.activity_type}
                      </span>
                    </p>
                    <p className="font-sans text-xs text-gray-400">{formatDateTime(activity.created_at)}</p>
                  </div>
                  {activity.description && <p className="font-sans text-sm text-gray-600 mt-0.5">{activity.description}</p>}
                  {activity.user_full_name && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-5 h-5 rounded-full bg-verde-vivid text-white text-[10px] font-bold flex items-center justify-center">
                        {initials(activity.user_full_name)}
                      </span>
                      <span className="font-sans text-xs text-gray-400">{activity.user_full_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
