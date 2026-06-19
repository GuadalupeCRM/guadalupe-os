import { useState } from 'react'
import FechamentoTab from './tabs/FechamentoTab'
import RealizadoVsProjetadoTab from './tabs/RealizadoVsProjetadoTab'
import MRRTab from './tabs/MRRTab'
import CanaisTab from './tabs/CanaisTab'
import ExportarTab from './tabs/ExportarTab'

const TABS = [
  { id: 'fechamento', label: 'Fechamento Mensal' },
  { id: 'realizado', label: 'Realizado vs Projetado' },
  { id: 'mrr', label: 'MRR' },
  { id: 'canais', label: 'Canais' },
  { id: 'exportar', label: 'Exportar' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function RelatoriosPage() {
  const [tab, setTab] = useState<TabId>('fechamento')

  return (
    <div>
      <h1 className="font-serif text-3xl mb-1">Relatórios</h1>
      <p className="text-gray-400 font-sans text-sm mb-6">
        Fechamentos mensais, análise de desempenho e exportações
      </p>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 font-sans text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-[#6BB42E] text-[#6BB42E]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fechamento' && <FechamentoTab />}
      {tab === 'realizado' && <RealizadoVsProjetadoTab />}
      {tab === 'mrr' && <MRRTab />}
      {tab === 'canais' && <CanaisTab />}
      {tab === 'exportar' && <ExportarTab />}
    </div>
  )
}
