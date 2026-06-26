import { useState } from 'react'
import { SKU_LABELS, BARRIL_SKU_LABELS, BARRIL_SKUS } from '../../../constants/business'
import { MOVEMENT_TYPE_LABELS } from '../constants'
import { useInventoryMovements, SKUS } from '../../../hooks/useEstoque'
import { formatNumber, formatDate, caixasFromLatas } from '../../../utils/formatters'
import type { SKUType, BarrilSKUType } from '../../../types'

function isBarrilSku(sku: SKUType | BarrilSKUType): sku is BarrilSKUType {
  return (BARRIL_SKUS as readonly string[]).includes(sku)
}

export default function HistoricoTab() {
  const [sku, setSku] = useState('')
  const [type, setType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: movements, isLoading } = useInventoryMovements({
    sku: sku ? (sku as SKUType | BarrilSKUType) : undefined,
    type: type ? (type as 'entrada' | 'saida') : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">SKU</label>
          <select value={sku} onChange={(e) => setSku(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            <option value="">Todos</option>
            <optgroup label="Latas">
              {SKUS.map((s) => <option key={s} value={s}>{SKU_LABELS[s]}</option>)}
            </optgroup>
            <optgroup label="Barris">
              {BARRIL_SKUS.map((s) => <option key={s} value={s}>{BARRIL_SKU_LABELS[s]} (Barril)</option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            <option value="">Todos</option>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">De</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Até</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        {(sku || type || startDate || endDate) && (
          <button
            onClick={() => { setSku(''); setType(''); setStartDate(''); setEndDate('') }}
            className="px-3 py-2 rounded-lg font-sans text-xs font-semibold text-gray-500 hover:bg-areia"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <p className="font-sans text-sm text-gray-400">Carregando histórico...</p>
      ) : !movements || movements.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-sans text-gray-400">Nenhum movimento encontrado.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-2.5">Data</th>
                  <th className="px-5 py-2.5">SKU</th>
                  <th className="px-5 py-2.5">Tipo</th>
                  <th className="px-5 py-2.5 text-right">Quantidade</th>
                  <th className="px-5 py-2.5 text-right">Total acumulado</th>
                  <th className="px-5 py-2.5">Notas</th>
                  <th className="px-5 py-2.5">NF Bling</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const barril = isBarrilSku(m.sku)
                  return (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-500">{formatDate(m.date)}</td>
                    <td className="px-5 py-2.5 text-gray-800 font-semibold">
                      {barril ? BARRIL_SKU_LABELS[m.sku] : SKU_LABELS[m.sku] ?? m.sku}
                      {barril && (
                        <span className="ml-2 font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-areia-warm text-gray-600">
                          BARRIL
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${m.type === 'entrada' ? 'bg-verde-pale text-verde-vivid' : 'bg-rosa-pale text-rosa-vivid'}`}>
                        {MOVEMENT_TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className={`px-5 py-2.5 text-right font-semibold ${m.type === 'entrada' ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
                      {barril
                        ? `${m.type === 'entrada' ? '+' : '-'}${formatNumber(m.units)} barris`
                        : `${m.type === 'entrada' ? '+' : '-'}${formatNumber(m.units)} latas (${formatNumber(caixasFromLatas(m.units))} cx)`}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-700 font-semibold">
                      {barril
                        ? `${formatNumber(m.running_total)} barris`
                        : `${formatNumber(m.running_total)} latas (${formatNumber(caixasFromLatas(m.running_total))} cx)`}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500">{m.notes ?? '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400">{m.bling_nf_id ?? '—'}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
