import { useState } from 'react'
import toast from 'react-hot-toast'
import { Bot, Plus, Info, UserPlus, Trash2 } from 'lucide-react'
import { NICHE_OPTIONS, NICHE_LABELS, DISCOVERY_STATUS_LABELS } from '../constants'
import { formatNumber } from '../../../utils/formatters'
import { useDiscovery, useAnalyzeDiscovery, useUpdateDiscoveryStatus, usePromoteDiscovery } from '../../../hooks/useAfiliadas'
import type { AffiliateDiscovery } from '../../../types'

const FIT_LABELS: Record<string, string> = {
  niche_match: 'Match de nicho',
  follower_range_match: 'Faixa de seguidores',
  engagement_vs_average: 'Engajamento vs média',
  city_match: 'Match de cidade',
  estimated_cost_per_result: 'Custo estimado por resultado',
}

function fitScoreColor(score: number): string {
  if (score >= 80) return 'text-verde-vivid'
  if (score >= 60) return 'text-amarelo-vivid'
  return 'text-rosa-vivid'
}

function DiscoveryCard({ item }: { item: AffiliateDiscovery }) {
  const updateStatus = useUpdateDiscoveryStatus()
  const promote = usePromoteDiscovery()

  const handlePromote = async () => {
    try {
      await promote.mutateAsync(item)
      toast.success('Adicionada ao pipeline como "Mapeada"')
    } catch {
      toast.error('Erro ao adicionar afiliada')
    }
  }

  const handleDiscard = async () => {
    try {
      await updateStatus.mutateAsync({ id: item.id, status: 'descartada' })
      toast.success('Sugestão descartada')
    } catch {
      toast.error('Erro ao descartar')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-serif text-lg text-gray-900">{item.name}</p>
          <p className="font-sans text-xs text-gray-400">{item.instagram_handle} · {item.city}</p>
        </div>
        {item.fit_score !== undefined && (
          <div className="text-right flex-shrink-0">
            <p className={`font-serif text-2xl ${fitScoreColor(item.fit_score)}`}>{item.fit_score}</p>
            <p className="font-sans text-[10px] text-gray-400 uppercase tracking-wider">Fit Score</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {(item.niche ?? []).map((n) => (
          <span key={n} className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rosa-pale text-rosa-vivid">
            {NICHE_LABELS[n] ?? n}
          </span>
        ))}
        <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          item.source === 'agent' ? 'bg-verde-pale text-verde-vivid' : 'bg-blue-50 text-blue-600'
        }`}>
          {item.source === 'agent' ? 'Sugestão do Agente' : 'Manual'}
        </span>
        <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {DISCOVERY_STATUS_LABELS[item.status]}
        </span>
      </div>

      <div className="font-sans text-xs text-gray-500 mb-2">
        {item.followers && <span>{formatNumber(item.followers)} seguidores</span>}
        {item.engagement_rate && <span> · {item.engagement_rate}% engajamento</span>}
      </div>

      {item.fit_breakdown && (
        <div className="bg-areia rounded-lg p-3 grid grid-cols-2 gap-2 mb-2">
          {Object.entries(item.fit_breakdown).map(([key, value]) => (
            <div key={key}>
              <p className="font-sans text-[10px] text-gray-400">{FIT_LABELS[key] ?? key}</p>
              <p className="font-sans text-sm font-semibold text-gray-700">{typeof value === 'number' ? `${value}%` : value}</p>
            </div>
          ))}
        </div>
      )}

      {item.notes && <p className="font-sans text-xs text-gray-500 italic mb-2">{item.notes}</p>}

      {(item.status === 'sugerida' || item.status === 'analisada') && (
        <div className="flex gap-2">
          <button onClick={handlePromote} disabled={promote.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            <UserPlus size={14} /> Adicionar ao pipeline
          </button>
          <button onClick={handleDiscard} disabled={updateStatus.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-sans text-xs font-semibold text-gray-400 hover:bg-gray-50">
            <Trash2 size={14} /> Descartar
          </button>
        </div>
      )}
    </div>
  )
}

function AddForAnalysisForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [followers, setFollowers] = useState('')
  const [engagement, setEngagement] = useState('')
  const [city, setCity] = useState('')
  const [niche, setNiche] = useState<string[]>([])
  const analyze = useAnalyzeDiscovery()

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome')
      return
    }
    try {
      await analyze.mutateAsync({
        name,
        instagram_handle: handle || undefined,
        followers: followers ? Number(followers) : undefined,
        engagement_rate: engagement ? Number(engagement) : undefined,
        niche,
        city: city || undefined,
      })
      toast.success('Análise concluída')
      setName(''); setHandle(''); setFollowers(''); setEngagement(''); setCity(''); setNiche([])
      onDone()
    } catch {
      toast.error('Erro ao analisar perfil')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Instagram (@)</label>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@usuario" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Seguidores</label>
          <input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Engajamento %</label>
          <input type="number" step="0.1" value={engagement} onChange={(e) => setEngagement(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Cidade</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
      </div>
      <div>
        <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nicho</label>
        <div className="flex flex-wrap gap-2">
          {NICHE_OPTIONS.map((opt) => {
            const checked = niche.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNiche((cur) => checked ? cur.filter((v) => v !== opt.value) : [...cur, opt.value])}
                className={`font-sans text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  checked ? 'bg-verde-vivid text-white' : 'bg-areia text-gray-500 hover:bg-areia-warm'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
        <button onClick={handleSubmit} disabled={analyze.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
          <Bot size={14} /> {analyze.isPending ? 'Analisando...' : 'Analisar com agente'}
        </button>
      </div>
    </div>
  )
}

export default function DescobertaTab() {
  const { data: discoveries, isLoading } = useDiscovery()
  const [showForm, setShowForm] = useState(false)

  const visible = (discoveries ?? []).filter((d) => d.status !== 'descartada' && d.status !== 'adicionada')

  return (
    <div className="space-y-5">
      <div className="bg-verde-pale border border-verde-mid rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-verde-vivid rounded-full flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-white" />
        </div>
        <div>
          <p className="font-sans text-sm font-semibold text-verde-vivid">Sugestões do Agente de Descoberta</p>
          <p className="font-sans text-xs text-gray-600 mt-0.5">
            Perfis sugeridos com base em afiliadas parceiras (mesmo nicho, porte e cidade) e em listas de concorrentes enviadas manualmente.
          </p>
          <p className="font-sans text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Info size={12} /> Sugestões baseadas em análise de perfil. Verificar manualmente antes de contatar.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-gray-400">{visible.length} sugestões disponíveis</p>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid">
          <Plus size={16} /> Adicionar influenciadora para análise
        </button>
      </div>

      {showForm && <AddForAnalysisForm onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando sugestões...</p>
      ) : visible.length === 0 ? (
        <p className="font-sans text-sm text-gray-400 text-center py-8">Nenhuma sugestão disponível.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((d) => <DiscoveryCard key={d.id} item={d} />)}
        </div>
      )}
    </div>
  )
}
