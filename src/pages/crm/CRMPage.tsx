import { useState } from 'react'
import { Users, Store, Activity, BarChart3 } from 'lucide-react'
import PipelineTab from './tabs/PipelineTab'
import PDVsTab from './tabs/PDVsTab'
import AtividadesTab from './tabs/AtividadesTab'
import AnaliseTab from './tabs/AnaliseTab'

const TABS = [
  { key: 'pipeline', label: 'Pipeline', icon: Users },
  { key: 'pdvs', label: 'PDVs', icon: Store },
  { key: 'atividades', label: 'Atividades', icon: Activity },
  { key: 'analise', label: 'Análise', icon: BarChart3 },
] as const

type TabKey = typeof TABS[number]['key']

export default function CRMPage() {
  const [tab, setTab] = useState<TabKey>('pipeline')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">CRM Comercial</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Pipeline de leads, pontos de venda, atividades e análise</p>
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

      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'pdvs' && <PDVsTab />}
      {tab === 'atividades' && <AtividadesTab />}
      {tab === 'analise' && <AnaliseTab />}
    </div>
  )
}
