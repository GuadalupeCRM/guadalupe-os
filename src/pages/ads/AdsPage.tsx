import { useState } from 'react'
import { PieChart, Megaphone, BarChart3, Bot } from 'lucide-react'
import BudgetTab from './tabs/BudgetTab'
import CampanhasTab from './tabs/CampanhasTab'
import PerformanceTab from './tabs/PerformanceTab'
import AgenteTab from './tabs/AgenteTab'

const TABS = [
  { key: 'budget', label: 'Budget 70/20/10', icon: PieChart },
  { key: 'campanhas', label: 'Campanhas', icon: Megaphone },
  { key: 'performance', label: 'Performance', icon: BarChart3 },
  { key: 'agente', label: 'Agente', icon: Bot },
] as const

type TabKey = typeof TABS[number]['key']

export default function AdsPage() {
  const [tab, setTab] = useState<TabKey>('budget')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Ads</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Gestão de budget e campanhas de mídia paga</p>
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

      {tab === 'budget' && <BudgetTab />}
      {tab === 'campanhas' && <CampanhasTab />}
      {tab === 'performance' && <PerformanceTab />}
      {tab === 'agente' && <AgenteTab />}
    </div>
  )
}
