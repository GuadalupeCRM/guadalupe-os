import { useState } from 'react'
import { Wallet, FileSpreadsheet, Package, Receipt, BarChart3 } from 'lucide-react'
import CaixaTab from './tabs/CaixaTab'
import DRETab from './tabs/DRETab'
import CMVTab from './tabs/CMVTab'
import NFsBlingTab from './tabs/NFsBlingTab'
import MargensTab from './tabs/MargensTab'

const TABS = [
  { key: 'caixa', label: 'Caixa', icon: Wallet },
  { key: 'dre', label: 'DRE', icon: FileSpreadsheet },
  { key: 'cmv', label: 'CMV por SKU', icon: Package },
  { key: 'nfs', label: 'NFs Bling', icon: Receipt },
  { key: 'margens', label: 'Margens por Canal', icon: BarChart3 },
] as const

type TabKey = typeof TABS[number]['key']

export default function FinanceiroPage() {
  const [tab, setTab] = useState<TabKey>('caixa')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Financeiro</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Caixa, resultado, CMV, notas fiscais e margens por canal</p>
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

      {tab === 'caixa' && <CaixaTab />}
      {tab === 'dre' && <DRETab />}
      {tab === 'cmv' && <CMVTab />}
      {tab === 'nfs' && <NFsBlingTab />}
      {tab === 'margens' && <MargensTab />}
    </div>
  )
}
