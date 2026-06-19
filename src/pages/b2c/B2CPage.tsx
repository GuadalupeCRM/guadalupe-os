import { useState } from 'react'
import { LayoutGrid, ShoppingBag, Heart, Mail, Search } from 'lucide-react'
import VisaoGeralTab from './tabs/VisaoGeralTab'
import ShopifyTab from './tabs/ShopifyTab'
import AfiliadasB2CTab from './tabs/AfiliadasB2CTab'
import EmailTab from '../marketing/tabs/EmailTab'
import SEOTab from '../marketing/tabs/SEOTab'

const TABS = [
  { key: 'visao_geral', label: 'Visão Geral', icon: LayoutGrid },
  { key: 'shopify', label: 'Shopify', icon: ShoppingBag },
  { key: 'afiliadas', label: 'Afiliadas', icon: Heart },
  { key: 'brevo', label: 'Brevo', icon: Mail },
  { key: 'seo', label: 'SEO', icon: Search },
] as const

type TabKey = typeof TABS[number]['key']

export default function B2CPage() {
  const [tab, setTab] = useState<TabKey>('visao_geral')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">B2C</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Visão geral do canal direto ao consumidor — Shopify, afiliadas, email e SEO</p>
      </div>

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

      {tab === 'visao_geral' && <VisaoGeralTab />}
      {tab === 'shopify' && <ShopifyTab />}
      {tab === 'afiliadas' && <AfiliadasB2CTab />}
      {tab === 'brevo' && <EmailTab />}
      {tab === 'seo' && <SEOTab />}
    </div>
  )
}
