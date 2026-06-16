import { ShoppingBag, ExternalLink, Package, TrendingUp, Globe } from 'lucide-react'

export default function B2CPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-rosa-vivid" />
          <h1 className="font-serif text-3xl text-gray-900">B2C / Site</h1>
        </div>
        <a href="https://guadalupedrink.com.br" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border border-areia-warm text-gray-600 font-sans text-sm rounded-lg hover:bg-areia">
          <Globe className="w-4 h-4" /> guadalupedrink.com.br
        </a>
      </div>

      {/* Canais */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'Shopify', url: 'guadalupedrink.com.br', status: 'Ativo', color: 'verde', desc: 'Loja principal' },
          { name: 'Mercado Livre', url: 'mercadolivre.com.br', status: 'Integrar', color: 'amarelo', desc: 'Omie → ML' },
          { name: 'Amazon', url: 'amazon.com.br', status: 'Integrar', color: 'amarelo', desc: 'Omie → Amazon' },
        ].map(c => (
          <div key={c.name} className="bg-white rounded-xl border border-areia-warm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-sans font-bold text-sm text-gray-800">{c.name}</p>
              <span className={`px-2 py-0.5 rounded-full font-sans text-xs font-semibold ${c.color === 'verde' ? 'bg-verde-pale text-verde-vivid' : 'bg-amarelo-pale text-yellow-700'}`}>
                {c.status}
              </span>
            </div>
            <p className="font-sans text-xs text-gray-400">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Produtos */}
      <div className="bg-white rounded-xl border border-areia-warm overflow-hidden">
        <div className="px-6 py-4 border-b border-areia-warm">
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-gray-600">Catálogo Ativo</h2>
        </div>
        <div className="divide-y divide-areia-warm">
          {[
            { name: 'Margarita Lime 310ml', sku: 'GUA-ML-001', price: 12.90, cmv: 3.93, abv: '7% ABV', status: 'Ativo' },
            { name: 'Paloma Grapefruit 310ml', sku: 'GUA-PG-001', price: 12.90, cmv: 4.02, abv: '7% ABV', status: 'Ativo' },
            { name: 'Mango Sour 310ml', sku: 'GUA-MS-001', price: 12.90, cmv: 3.82, abv: '7% ABV', status: 'Lançamento' },
          ].map(p => (
            <div key={p.sku} className="px-6 py-4 flex items-center justify-between hover:bg-areia">
              <div>
                <p className="font-sans font-semibold text-sm text-gray-900">{p.name}</p>
                <p className="font-sans text-xs text-gray-400 mt-0.5">{p.sku} · {p.abv}</p>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="font-sans text-sm font-semibold text-gray-900">R${p.price.toFixed(2)}</p>
                  <p className="font-sans text-xs text-gray-400">CMV R${p.cmv.toFixed(2)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-sans text-xs font-semibold ${p.status === 'Ativo' ? 'bg-verde-pale text-verde-vivid' : 'bg-amarelo-pale text-yellow-700'}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frete e política */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-areia-warm p-5">
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-gray-600 mb-3">Política de Frete</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="font-sans text-xs text-gray-500">Frete grátis acima de</span><span className="font-sans text-sm font-semibold text-gray-900">R$157,00</span></div>
            <div className="flex justify-between"><span className="font-sans text-xs text-gray-500">Prazo médio</span><span className="font-sans text-sm font-semibold text-gray-900">3–7 dias úteis</span></div>
            <div className="flex justify-between"><span className="font-sans text-xs text-gray-500">Transportadora</span><span className="font-sans text-sm font-semibold text-gray-900">Correios / TNT</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-areia-warm p-5">
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-gray-600 mb-3">Legal</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="font-sans text-xs text-gray-500">Razão Social</span><span className="font-sans text-xs font-semibold text-gray-900">Guadalupe Comércio de Bebidas LTDA</span></div>
            <div className="flex justify-between"><span className="font-sans text-xs text-gray-500">CNPJ</span><span className="font-sans text-sm font-semibold text-gray-900">58.920.022/0001-50</span></div>
            <div className="flex justify-between"><span className="font-sans text-xs text-gray-500">Regime</span><span className="font-sans text-sm font-semibold text-gray-900">Simples Nacional</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
