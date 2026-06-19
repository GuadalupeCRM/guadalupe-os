import { useState } from 'react'
import { Download, Sheet, Mail, Info } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { exportCsv } from '../utils/exportCsv'

function today() {
  return new Date().toISOString().slice(0, 10)
}
function monthStart(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  return d.toISOString().slice(0, 10)
}

interface ExportDef {
  id: string
  label: string
  description: string
  filename: string
  fetch: (from: string, to: string) => Promise<Record<string, unknown>[]>
}

const EXPORTS: ExportDef[] = [
  {
    id: 'receitas',
    label: 'Receitas por canal',
    description: 'channel_revenue — semana, canal, receita, CMV, margem',
    filename: 'receitas_canal',
    fetch: async (from, to) => {
      const { data } = await supabase
        .from('channel_revenue')
        .select('week_start,canal,revenue,units_sold,cmv_total,gross_margin,net_margin')
        .gte('week_start', from)
        .lte('week_start', to)
        .order('week_start')
      return (data ?? []) as Record<string, unknown>[]
    },
  },
  {
    id: 'caixa',
    label: 'Fluxo de caixa',
    description: 'cash_entries — data, tipo, categoria, valor, descrição',
    filename: 'fluxo_caixa',
    fetch: async (from, to) => {
      const { data } = await supabase
        .from('cash_entries')
        .select('date,type,category,value,description')
        .gte('date', from)
        .lte('date', to)
        .order('date')
      return (data ?? []) as Record<string, unknown>[]
    },
  },
  {
    id: 'leads',
    label: 'Leads (CRM)',
    description: 'leads — nome, empresa, estágio, canal, valor estimado',
    filename: 'leads',
    fetch: async (from, to) => {
      const { data } = await supabase
        .from('leads')
        .select('nome,empresa,stage,canal,valor_estimado,created_at,last_activity_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at')
      return (data ?? []) as Record<string, unknown>[]
    },
  },
  {
    id: 'eventos',
    label: 'Eventos',
    description: 'events — nome, data, canal, receita, margem, UGCs',
    filename: 'eventos',
    fetch: async (from, to) => {
      const { data } = await supabase
        .from('events')
        .select('name,event_date,canal,gross_revenue,net_margin,ugc_count,stage')
        .gte('event_date', from)
        .lte('event_date', to)
        .order('event_date')
      return (data ?? []) as Record<string, unknown>[]
    },
  },
  {
    id: 'nfs',
    label: 'Notas fiscais (Bling)',
    description: 'bling_nfs — número, cliente, canal, valor, data',
    filename: 'notas_fiscais',
    fetch: async (from, to) => {
      const { data } = await supabase
        .from('bling_nfs')
        .select('nf_number,cliente,cnpj,canal,valor,data,status')
        .gte('data', from)
        .lte('data', to)
        .order('data')
      return (data ?? []) as Record<string, unknown>[]
    },
  },
]

export default function ExportarTab() {
  const [from, setFrom] = useState(monthStart(-1))
  const [to, setTo] = useState(today())
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleExport(def: ExportDef) {
    setLoading(def.id)
    setError(null)
    try {
      const rows = await def.fetch(from, to)
      if (rows.length === 0) {
        setError(`Nenhum dado encontrado para "${def.label}" no período selecionado.`)
        return
      }
      const label = `${from}_${to}`.replace(/-/g, '')
      exportCsv(`${def.filename}_${label}.csv`, rows)
    } catch (e) {
      setError(`Erro ao exportar ${def.label}: ${String(e)}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Date range */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide">
          Período de exportação
        </h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="font-sans text-xs text-gray-400">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#6BB42E]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-sans text-xs text-gray-400">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#6BB42E]"
            />
          </div>
          <div className="flex gap-2 mt-4">
            {[
              { label: 'Mês ant.', from: monthStart(-1), to: today() },
              { label: 'Últimos 3m', from: monthStart(-3), to: today() },
              { label: 'Últimos 6m', from: monthStart(-6), to: today() },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => { setFrom(p.from); setTo(p.to) }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-sans text-gray-600 hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FBE4EA] border border-[#F18EA0] rounded-xl p-4 text-sm font-sans text-[#E21655]">
          {error}
        </div>
      )}

      {/* Export buttons */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
        <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide">
          Exportar CSV
        </h3>
        {EXPORTS.map((def) => (
          <div
            key={def.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div>
              <p className="font-sans font-semibold text-sm text-gray-700">{def.label}</p>
              <p className="font-sans text-xs text-gray-400 mt-0.5">{def.description}</p>
            </div>
            <button
              onClick={() => handleExport(def)}
              disabled={loading === def.id}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6BB42E] text-white text-sm font-sans font-semibold hover:bg-[#5a9a26] disabled:opacity-60 shrink-0"
            >
              <Download size={14} className={loading === def.id ? 'animate-bounce' : ''} />
              {loading === def.id ? 'Exportando...' : 'CSV'}
            </button>
          </div>
        ))}
      </div>

      {/* Coming soon actions */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-3">
        <h3 className="font-sans font-semibold text-sm text-gray-500 mb-4 uppercase tracking-wide">
          Outras opções
        </h3>

        {/* Google Sheets */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
          <div>
            <p className="font-sans font-semibold text-sm text-gray-400">
              Exportar para Google Sheets
            </p>
            <p className="font-sans text-xs text-gray-300 mt-0.5">Integração em breve</p>
          </div>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-400 text-sm font-sans font-semibold cursor-not-allowed"
          >
            <Sheet size={14} />
            Em breve
          </button>
        </div>

        {/* Email DRE */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
          <div className="flex items-start gap-2">
            <div>
              <p className="font-sans font-semibold text-sm text-gray-400">
                Enviar DRE por e-mail
              </p>
              <p className="font-sans text-xs text-gray-300 mt-0.5">
                Envio automático via Brevo
              </p>
            </div>
            <div className="relative group">
              <Info size={14} className="text-gray-300 cursor-help mt-0.5" />
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-gray-800 text-white text-xs rounded-lg p-2 font-sans opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                Em breve — integração de envio de e-mail via Brevo ainda não disponível.
              </div>
            </div>
          </div>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-400 text-sm font-sans font-semibold cursor-not-allowed"
          >
            <Mail size={14} />
            Em breve
          </button>
        </div>
      </div>
    </div>
  )
}
