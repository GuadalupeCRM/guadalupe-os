import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { AFFILIATE_STATUS_LABELS } from '../../../constants/business'
import { STAGE_ORDER, STAGE_BADGE, NICHE_LABELS } from '../constants'
import { formatNumber } from '../../../utils/formatters'
import { useAffiliates, useUpdateAffiliateStage } from '../../../hooks/useAfiliadas'
import AffiliateForm from '../components/AffiliateForm'
import AffiliateDetailPanel from '../components/AffiliateDetailPanel'
import type { AffiliateStatus } from '../../../types'
import type { AffiliateWithStats } from '../../../hooks/useAfiliadas'

function AffiliateCard({ affiliate, onClick }: { affiliate: AffiliateWithStats; onClick: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', affiliate.id)}
      onClick={onClick}
      className="bg-white border border-areia-warm rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow"
    >
      <p className="font-sans font-semibold text-sm text-gray-800 leading-tight truncate">{affiliate.name}</p>
      {affiliate.instagram_handle && <p className="font-sans text-xs text-gray-400 mb-1.5 truncate">{affiliate.instagram_handle}</p>}
      <div className="flex items-center gap-2 font-sans text-[11px] text-gray-500 mb-1.5">
        {affiliate.instagram_followers && <span>{formatNumber(affiliate.instagram_followers)} seg.</span>}
        {affiliate.engagement_rate && <span>· {affiliate.engagement_rate}% eng.</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {(affiliate.niche ?? []).map((n) => (
          <span key={n} className="font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rosa-pale text-rosa-vivid">
            {NICHE_LABELS[n] ?? n}
          </span>
        ))}
      </div>
      {affiliate.city && <p className="font-sans text-[11px] text-gray-400 mt-1.5">{affiliate.city}</p>}
    </div>
  )
}

export default function PipelineTab() {
  const { data: affiliates, isLoading } = useAffiliates()
  const updateStage = useUpdateAffiliateStage()
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const byStage = useMemo(() => {
    const map = new Map<string, AffiliateWithStats[]>()
    STAGE_ORDER.forEach((s) => map.set(s, []))
    ;(affiliates ?? []).forEach((a) => {
      const list = map.get(a.status) ?? []
      list.push(a)
      map.set(a.status, list)
    })
    return map
  }, [affiliates])

  const handleDrop = async (e: React.DragEvent, stage: AffiliateStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    try {
      await updateStage.mutateAsync({ id, stage })
      toast.success(`Movido para ${AFFILIATE_STATUS_LABELS[stage]}`)
    } catch {
      toast.error('Erro ao mover afiliada')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-gray-400">{(affiliates ?? []).length} afiliadas no pipeline</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid"
        >
          <Plus size={16} /> Nova Afiliada
        </button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando pipeline...</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGE_ORDER.map((stage) => {
            const list = byStage.get(stage) ?? []
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage)}
                className="bg-areia rounded-xl p-2 w-64 flex-shrink-0 flex flex-col max-h-[calc(100vh-320px)]"
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[stage]}`}>
                    {AFFILIATE_STATUS_LABELS[stage]}
                  </span>
                  <span className="font-sans text-xs font-bold text-gray-400">{list.length}</span>
                </div>
                <div className="space-y-2 overflow-y-auto px-1 pb-1">
                  {list.map((a) => (
                    <AffiliateCard key={a.id} affiliate={a} onClick={() => setSelectedId(a.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AffiliateForm open={showForm} onClose={() => setShowForm(false)} />
      {selectedId && <AffiliateDetailPanel affiliateId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
