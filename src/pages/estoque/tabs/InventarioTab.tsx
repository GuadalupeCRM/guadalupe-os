import { useState } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle, Package, Wallet, RefreshCw } from 'lucide-react'
import { SKU_LABELS } from '../../../constants/business'
import { useInventory } from '../../../hooks/useEstoque'
import { formatCurrency, formatNumber, formatDate, caixasFromLatas } from '../../../utils/formatters'
import MovementForm from '../components/MovementForm'
import type { SKUInventorySummary } from '../../../hooks/useEstoque'
import type { SKUType, InventoryMovementType } from '../../../types'

function stockColor(summary: SKUInventorySummary): string {
  if (summary.currentStock < summary.reorderPoint) return 'text-rosa-vivid'
  if (summary.currentStock < summary.reorderPoint * 2) return 'text-amarelo-vivid'
  return 'text-verde-vivid'
}

function SkuCard({ summary, onMove }: { summary: SKUInventorySummary; onMove: (type: InventoryMovementType) => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
      <p className="font-serif text-xl text-gray-900">{SKU_LABELS[summary.sku]}</p>
      <p className={`font-serif text-5xl mt-2 ${stockColor(summary)}`}>{formatNumber(caixasFromLatas(summary.currentStock))}</p>
      <p className="font-sans text-xs text-gray-400 mt-1">caixas em estoque</p>
      <p className="font-sans text-xs text-gray-400">(= {formatNumber(summary.currentStock)} latas)</p>

      <div className="mt-4 space-y-1.5 font-sans text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Ponto de reposição</span>
          <span className="font-semibold text-gray-700">
            {formatNumber(caixasFromLatas(summary.reorderPoint))} cx ({formatNumber(summary.reorderPoint)} latas)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">CMV por lata</span>
          <span className="font-semibold text-gray-700">{formatCurrency(summary.cmv)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Última atualização</span>
          <span className="font-semibold text-gray-700">{summary.lastUpdated ? formatDate(summary.lastUpdated) : '—'}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-areia-warm">
        <button
          onClick={() => onMove('saida')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs border border-areia-warm text-gray-600 hover:bg-areia"
        >
          <ArrowDownCircle size={14} /> Dar baixa
        </button>
        <button
          onClick={() => onMove('entrada')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-verde-vivid text-white hover:bg-verde-mid"
        >
          <ArrowUpCircle size={14} /> Entrada
        </button>
      </div>
    </div>
  )
}

export default function InventarioTab() {
  const { data, isLoading } = useInventory()
  const [showForm, setShowForm] = useState(false)
  const [quickMove, setQuickMove] = useState<{ sku: SKUType; type: InventoryMovementType } | null>(null)

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando inventário...</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid"
        >
          <Plus size={16} /> Atualizar Estoque
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.bySku.map((summary) => (
          <SkuCard key={summary.sku} summary={summary} onMove={(type) => setQuickMove({ sku: summary.sku, type })} />
        ))}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-areia border border-gray-200 rounded-xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-verde-pale flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-verde-vivid" />
          </div>
          <div>
            <p className="font-sans text-xs text-gray-400 uppercase tracking-wider font-semibold">Total em estoque</p>
            <p className="font-serif text-2xl text-gray-900">
              {formatNumber(caixasFromLatas(data.totalCans))} cx / {formatNumber(data.totalCans)} latas
            </p>
          </div>
        </div>
        <div className="bg-areia border border-gray-200 rounded-xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amarelo-pale flex items-center justify-center flex-shrink-0">
            <Wallet size={18} className="text-amarelo-vivid" />
          </div>
          <div>
            <p className="font-sans text-xs text-gray-400 uppercase tracking-wider font-semibold">Valor em estoque</p>
            <p className="font-serif text-2xl text-gray-900">{formatCurrency(data.totalValue)}</p>
          </div>
        </div>
        <div className="bg-areia border border-gray-200 rounded-xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rosa-pale flex items-center justify-center flex-shrink-0">
            <RefreshCw size={18} className="text-rosa-vivid" />
          </div>
          <div>
            <p className="font-sans text-xs text-gray-400 uppercase tracking-wider font-semibold">Última sincronização Bling</p>
            <p className="font-serif text-lg text-gray-900">
              {data.lastBlingSync
                ? new Date(data.lastBlingSync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <MovementForm open={showForm} onClose={() => setShowForm(false)} />
      {quickMove && (
        <MovementForm
          open
          onClose={() => setQuickMove(null)}
          defaultSku={quickMove.sku}
          defaultType={quickMove.type}
        />
      )}
    </div>
  )
}
