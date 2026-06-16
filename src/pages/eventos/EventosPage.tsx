import { useState } from 'react'
import { Kanban, PlayCircle, History, BarChart3 } from 'lucide-react'
import PipelineTab from './tabs/PipelineTab'
import EmExecucaoTab from './tabs/EmExecucaoTab'
import HistoricoTab from './tabs/HistoricoTab'
import AnaliseTab from './tabs/AnaliseTab'

const TABS = [
  { key: 'pipeline', label: 'Pipeline', icon: Kanban },
  { key: 'execucao', label: 'Em Execução', icon: PlayCircle },
  { key: 'historico', label: 'Histórico', icon: History },
  { key: 'analise', label: 'Análise', icon: BarChart3 },
] as const

type TabKey = typeof TABS[number]['key']

export default function EventosPage() {
  const [tab, setTab] = useState<TabKey>('pipeline')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Eventos</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Pipeline, execução, histórico e análise de eventos</p>
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
      {tab === 'execucao' && <EmExecucaoTab />}
      {tab === 'historico' && <HistoricoTab />}
      {tab === 'analise' && <AnaliseTab />}
    </div>
  )
}
