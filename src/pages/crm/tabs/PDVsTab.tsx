import { useMemo, useState } from 'react'
import { MapPin, Phone, Plus, AlertTriangle } from 'lucide-react'
import { CHANNEL_LABELS } from '../../../constants/business'
import { CANAL_BADGE } from '../constants'
import { formatNumber, formatDate } from '../../../utils/formatters'
import { usePDVs, PDV_RISK_DAYS } from '../../../hooks/useCRM'
import PDVDetailPanel from '../components/PDVDetailPanel'
import ConvertLeadModal from '../components/ConvertLeadModal'
import type { PDVWithStats } from '../../../hooks/useCRM'

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  em_risco: 'Em Risco',
  inativo: 'Inativo',
}

const STATUS_BADGE: Record<string, string> = {
  ativo: 'bg-verde-pale text-verde-vivid',
  em_risco: 'bg-rosa-pale text-rosa-vivid',
  inativo: 'bg-gray-100 text-gray-400',
}

function lastOrderColor(days: number | null): string {
  if (days === null) return 'text-gray-400'
  if (days < 15) return 'text-verde-vivid'
  if (days <= 30) return 'text-amarelo-vivid'
  return 'text-rosa-vivid'
}

function PDVCard({ pdv, onClick }: { pdv: PDVWithStats; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-white border border-areia-warm rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-sans font-semibold text-sm text-gray-800 leading-tight">{pdv.business_name}</p>
        <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_BADGE[pdv.status] ?? 'bg-gray-100 text-gray-400'}`}>
          {STATUS_LABELS[pdv.status] ?? pdv.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CANAL_BADGE[pdv.canal] ?? 'bg-gray-100 text-gray-500'}`}>
          {CHANNEL_LABELS[pdv.canal] ?? pdv.canal}
        </span>
      </div>
      {(pdv.neighborhood || pdv.city) && (
        <p className="font-sans text-xs text-gray-400 flex items-center gap-1">
          <MapPin size={11} />
          {[pdv.neighborhood, pdv.city].filter(Boolean).join(', ')}
        </p>
      )}
      {pdv.phone && (
        <p className="font-sans text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Phone size={11} />{pdv.phone}
        </p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div>
          <p className="font-sans text-[11px] text-gray-400">Média mensal</p>
          <p className="font-sans text-sm font-semibold text-gray-800">{formatNumber(pdv.monthly_avg_units)} latas</p>
        </div>
        <div className="text-right">
          <p className="font-sans text-[11px] text-gray-400">Último pedido</p>
          <p className={`font-sans text-sm font-semibold ${lastOrderColor(pdv.daysSinceLastOrder)}`}>
            {pdv.last_order_date ? formatDate(pdv.last_order_date) : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PDVsTab() {
  const { data: pdvs, isLoading } = usePDVs()
  const [status, setStatus] = useState('')
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [showRisco, setShowRisco] = useState(false)
  const [selectedPdvId, setSelectedPdvId] = useState<string | null>(null)
  const [showConvertModal, setShowConvertModal] = useState(false)

  const cities = useMemo(() => Array.from(new Set((pdvs ?? []).map((p) => p.city).filter(Boolean))), [pdvs])
  const neighborhoods = useMemo(() => Array.from(new Set((pdvs ?? []).map((p) => p.neighborhood).filter(Boolean))), [pdvs])

  const filtered = (pdvs ?? []).filter((p) => {
    if (status && p.status !== status) return false
    if (city && p.city !== city) return false
    if (neighborhood && p.neighborhood !== neighborhood) return false
    if (showRisco && (p.daysSinceLastOrder === null || p.daysSinceLastOrder <= PDV_RISK_DAYS)) return false
    return true
  })

  const emRiscoCount = (pdvs ?? []).filter((p) => p.daysSinceLastOrder !== null && p.daysSinceLastOrder > PDV_RISK_DAYS).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap items-center">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600">
            <option value="">Todos status</option>
            <option value="ativo">Ativo</option>
            <option value="em_risco">Em Risco</option>
            <option value="inativo">Inativo</option>
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600">
            <option value="">Todas cidades</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-1.5 font-sans text-xs bg-white focus:outline-none focus:border-verde-vivid text-gray-600">
            <option value="">Todos bairros</option>
            {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button
            onClick={() => setShowRisco((v) => !v)}
            className={`flex items-center gap-1.5 font-sans text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              showRisco ? 'bg-rosa-vivid text-white' : 'bg-rosa-pale text-rosa-vivid opacity-70 hover:opacity-100'
            }`}
          >
            <AlertTriangle size={12} /> PDVs em risco ({emRiscoCount})
          </button>
        </div>
        <button
          onClick={() => setShowConvertModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid"
        >
          <Plus size={16} /> Converter Lead em PDV
        </button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando PDVs...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-sans text-gray-400">Nenhum PDV encontrado com esses filtros.</p>
        </div>
      ) : (
        <>
          <p className="font-sans text-xs text-gray-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((pdv) => <PDVCard key={pdv.id} pdv={pdv} onClick={() => setSelectedPdvId(pdv.id)} />)}
          </div>
        </>
      )}

      {selectedPdvId && <PDVDetailPanel pdvId={selectedPdvId} onClose={() => setSelectedPdvId(null)} />}
      {showConvertModal && <ConvertLeadModal onClose={() => setShowConvertModal(false)} />}
    </div>
  )
}
