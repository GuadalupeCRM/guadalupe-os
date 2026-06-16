import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { BarChart2, Clock, CheckCircle, AlertCircle } from 'lucide-react'

const STAGES: any = {
  novo: { label: 'Novo', color: 'bg-gray-100 text-gray-600' },
  contato: { label: 'Contato', color: 'bg-amarelo-pale text-yellow-700' },
  proposta: { label: 'Proposta', color: 'bg-rosa-pale text-rosa-vivid' },
  negociacao: { label: 'Negociação', color: 'bg-verde-pale text-verde-vivid' },
  fechado: { label: 'Fechado', color: 'bg-verde-vivid text-white' },
}

export default function MeuPipelinePage() {
  const { profile } = useAuth()

  const { data: leads } = useQuery({
    queryKey: ['meu-pipeline', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads').select('*')
        .eq('assigned_to', profile?.id)
        .order('last_activity_at', { ascending: false })
      return data ?? []
    },
    enabled: !!profile?.id,
  })

  const total   = (leads ?? []).length
  const fechados = (leads ?? []).filter((l: any) => l.stage === 'fechado').length
  const ativos  = (leads ?? []).filter((l: any) => !['fechado','inativo','perdido'].includes(l.stage)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart2 className="w-6 h-6 text-verde-vivid" />
        <h1 className="font-serif text-3xl text-gray-900">Meu Pipeline</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: total, icon: BarChart2, color: 'gray' },
          { label: 'Ativos', value: ativos, icon: Clock, color: 'amarelo' },
          { label: 'Fechados', value: fechados, icon: CheckCircle, color: 'verde' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-areia-warm p-5">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className="w-4 h-4 text-gray-400" />
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">{k.label}</p>
            </div>
            <p className={`font-serif text-4xl ${k.color === 'verde' ? 'text-verde-vivid' : k.color === 'amarelo' ? 'text-yellow-600' : 'text-gray-900'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {leads && leads.length > 0 ? (
        <div className="bg-white rounded-xl border border-areia-warm overflow-hidden">
          <div className="px-6 py-4 border-b border-areia-warm">
            <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-gray-600">Meus Leads</h2>
          </div>
          <div className="divide-y divide-areia-warm">
            {(leads as any[]).map((l: any) => {
              const stage = STAGES[l.stage] ?? { label: l.stage, color: 'bg-gray-100 text-gray-600' }
              const hoursAgo = Math.floor((Date.now() - new Date(l.last_activity_at).getTime()) / 3600000)
              return (
                <div key={l.id} className="px-6 py-4 flex items-center justify-between hover:bg-areia">
                  <div>
                    <p className="font-sans font-semibold text-sm text-gray-900">{l.business_name || l.name}</p>
                    <p className="font-sans text-xs text-gray-400 mt-0.5">{l.canal} · {l.city}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {hoursAgo > 48 && <AlertCircle className="w-4 h-4 text-rosa-vivid" />}
                    <span className="font-sans text-xs text-gray-400">{hoursAgo}h atrás</span>
                    <span className={`px-2 py-0.5 rounded-full font-sans text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-areia-warm p-10 text-center">
          <BarChart2 className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="font-sans font-semibold text-gray-500">Nenhum lead atribuído a você</p>
          <p className="font-sans text-xs text-gray-400 mt-1">Leads do CRM aparecerão aqui quando atribuídos</p>
        </div>
      )}
    </div>
  )
}
