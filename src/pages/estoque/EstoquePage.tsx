import { useState } from 'react'
import { Boxes, History, DollarSign, AlertTriangle } from 'lucide-react'
import InventarioTab from './tabs/InventarioTab'
import HistoricoTab from './tabs/HistoricoTab'
import CMVTab from './tabs/CMVTab'
import AlertasTab from './tabs/AlertasTab'

const TABS = [
  { key: 'inventario', label: 'Inventário', icon: Boxes },
  { key: 'historico', label: 'Histórico', icon: History },
  { key: 'cmv', label: 'CMV por Lata', icon: DollarSign },
  { key: 'alertas', label: 'Alertas', icon: AlertTriangle },
] as const

type TabKey = typeof TABS[number]['key']

export default function EstoquePage() {
  const [tab, setTab] = useState<TabKey>('inventario')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Estoque</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Inventário, histórico, CMV por lata e alertas de reposição</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-areia rounded-xl p-1 w-fit overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm transition-all whitespace-nowrap ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventario' && <InventarioTab />}
      {tab === 'historico' && <HistoricoTab />}
      {tab === 'cmv' && <CMVTab />}
      {tab === 'alertas' && <AlertasTab />}
    </div>
  )
}
