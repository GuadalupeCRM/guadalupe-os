import toast from 'react-hot-toast'
import Modal from '../../../components/ui/Modal'
import { CRM_STAGE_LABELS } from '../../../constants/business'
import { STAGE_BADGE } from '../constants'
import { useLeads, useConvertLeadToPDV } from '../../../hooks/useCRM'

const QUALIFIED_STAGES = ['qualificado', 'proposta_enviada', 'negociacao', 'primeiro_pedido', 'ativo']

export default function ConvertLeadModal({ onClose }: { onClose: () => void }) {
  const { data: leads, isLoading } = useLeads()
  const convertToPDV = useConvertLeadToPDV()

  const qualified = (leads ?? []).filter((l) => QUALIFIED_STAGES.includes(l.stage))

  const handleConvert = async (leadId: string) => {
    const lead = qualified.find((l) => l.id === leadId)
    if (!lead) return
    try {
      await convertToPDV.mutateAsync(lead)
      toast.success('Lead convertido em PDV')
      onClose()
    } catch {
      toast.error('Erro ao converter lead')
    }
  }

  return (
    <Modal open onClose={onClose} title="Converter Lead em PDV" maxWidth="max-w-lg">
      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando leads...</p>
      ) : qualified.length === 0 ? (
        <p className="font-sans text-sm text-gray-400">Nenhum lead qualificado disponível para conversão.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {qualified.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between gap-2 border border-areia-warm rounded-lg p-3">
              <div className="min-w-0">
                <p className="font-sans font-semibold text-sm text-gray-800 truncate">{lead.business_name || lead.name}</p>
                <p className="font-sans text-xs text-gray-400 truncate">{lead.name} · {lead.city}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STAGE_BADGE[lead.stage]}`}>
                  {CRM_STAGE_LABELS[lead.stage]}
                </span>
                <button
                  onClick={() => handleConvert(lead.id)}
                  disabled={convertToPDV.isPending}
                  className="px-3 py-1.5 rounded-lg font-sans text-xs font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50"
                >
                  Converter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
