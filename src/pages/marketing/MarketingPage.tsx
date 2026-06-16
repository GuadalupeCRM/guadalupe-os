import { useState } from 'react'
import { Instagram, Target, Search, Mail } from 'lucide-react'
import IGTab from './tabs/IGTab'
import MetasTab from './tabs/MetasTab'
import SEOTab from './tabs/SEOTab'
import EmailTab from './tabs/EmailTab'

const TABS = [
  { key: 'ig', label: 'Métricas IG', icon: Instagram },
  { key: 'metas', label: 'Metas do Mês', icon: Target },
  { key: 'seo', label: 'SEO', icon: Search },
  { key: 'email', label: 'Email Marketing', icon: Mail },
] as const

type TabKey = typeof TABS[number]['key']

export default function MarketingPage() {
  const [tab, setTab] = useState<TabKey>('ig')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Marketing</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Instagram, metas, SEO e email marketing</p>
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

      {tab === 'ig' && <IGTab />}
      {tab === 'metas' && <MetasTab />}
      {tab === 'seo' && <SEOTab />}
      {tab === 'email' && <EmailTab />}
    </div>
  )
}
