import { useState } from 'react'
import { Kanban, Tag, BarChart3, Sparkles } from 'lucide-react'
import PipelineTab from './tabs/PipelineTab'
import CuponsTab from './tabs/CuponsTab'
import PerformanceTab from './tabs/PerformanceTab'
import DescobertaTab from './tabs/DescobertaTab'

const TABS = [
  { key: 'pipeline', label: 'Pipeline', icon: Kanban },
  { key: 'cupons', label: 'Cupons', icon: Tag },
  { key: 'performance', label: 'Performance', icon: BarChart3 },
  { key: 'descoberta', label: 'Descoberta', icon: Sparkles },
] as const

type TabKey = typeof TABS[number]['key']

export default function AfiliadasPage() {
  const [tab, setTab] = useState<TabKey>('pipeline')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Afiliadas</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Influenciadoras e parceiras de cupom</p>
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
      {tab === 'cupons' && <CuponsTab />}
      {tab === 'performance' && <PerformanceTab />}
      {tab === 'descoberta' && <DescobertaTab />}
    </div>
  )
}
