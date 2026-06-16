import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Search, MousePointerClick, Eye, Percent, ArrowUpDown, Plus } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import {
  useSEOConnectionStatus, useSEOKeywords, useSEOMetrics,
  useCreateSEOKeyword, useCreateSEOMetric,
} from '../../../hooks/useMarketing'
import { monthLabel, currentMonthKey } from '../../../hooks/useFinanceiro'
import { formatNumber, formatPercent } from '../../../utils/formatters'

const KEYWORD_COLORS = ['#E21655', '#FAAE1A', '#6BB42E', '#A2C96C', '#F18EA0', '#FED873']

// ============================================================
// KPI
// ============================================================
function KPICard({ icon: Icon, label, value }: { icon: typeof Search; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-verde-pale flex items-center justify-center">
          <Icon size={14} className="text-verde-vivid" />
        </div>
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className="font-serif text-3xl text-gray-900">{value}</p>
    </div>
  )
}

// ============================================================
// FORM — ADICIONAR PALAVRA-CHAVE
// ============================================================
function AddKeywordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keyword, setKeyword] = useState('')
  const createKeyword = useCreateSEOKeyword()

  const handleSubmit = async () => {
    if (!keyword.trim()) {
      toast.error('Informe a palavra-chave')
      return
    }
    try {
      await createKeyword.mutateAsync(keyword.trim().toLowerCase())
      toast.success('Palavra-chave adicionada')
      setKeyword('')
      onClose()
    } catch {
      toast.error('Erro ao adicionar palavra-chave')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Palavra-chave Estratégica">
      <div className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Palavra-chave</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Ex: tequila soda lata"
            className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={createKeyword.isPending} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {createKeyword.isPending ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================================
// FORM — INPUT MANUAL DE MÉTRICAS
// ============================================================
const metricSchema = z.object({
  keyword_id: z.string().min(1, 'Selecione a palavra-chave'),
  month: z.string().min(1, 'Informe o mês'),
  clicks: z.coerce.number().int().min(0),
  impressions: z.coerce.number().int().min(0),
  ctr: z.coerce.number().min(0),
  position: z.coerce.number().min(0),
})

type MetricForm = z.infer<typeof metricSchema>

function ManualSEOModal({ open, onClose, keywords }: { open: boolean; onClose: () => void; keywords: { id: string; keyword: string }[] }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MetricForm>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      keyword_id: keywords[0]?.id ?? '', month: currentMonthKey(),
      clicks: undefined as unknown as number, impressions: undefined as unknown as number,
      ctr: undefined as unknown as number, position: undefined as unknown as number,
    },
  })
  const createMetric = useCreateSEOMetric()

  const onSubmit = async (values: MetricForm) => {
    try {
      await createMetric.mutateAsync(values)
      toast.success('Métricas salvas')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao salvar métricas')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Métricas SEO">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Palavra-chave</label>
          <select {...register('keyword_id')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {keywords.map((k) => <option key={k.id} value={k.id}>{k.keyword}</option>)}
          </select>
          {errors.keyword_id && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.keyword_id.message}</p>}
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Mês (AAAA-MM)</label>
          <input type="month" {...register('month')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Cliques</label>
            <input type="number" {...register('clicks')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Impressões</label>
            <input type="number" {...register('impressions')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">CTR (%)</label>
            <input type="number" step="0.01" {...register('ctr')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Posição média</label>
            <input type="number" step="0.1" {...register('position')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ============================================================
// TAB
// ============================================================
export default function SEOTab() {
  const { data: connection } = useSEOConnectionStatus()
  const { data: keywords, isLoading: loadingKeywords } = useSEOKeywords()
  const { data: metrics, isLoading: loadingMetrics } = useSEOMetrics()
  const [showKeywordModal, setShowKeywordModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)

  const latestMonth = useMemo(() => {
    if (!metrics || metrics.length === 0) return null
    return metrics.reduce((max, m) => (m.month > max ? m.month : max), metrics[0].month)
  }, [metrics])

  const currentMetrics = useMemo(() => {
    if (!metrics || !latestMonth) return []
    return metrics.filter((m) => m.month === latestMonth)
  }, [metrics, latestMonth])

  const kpis = useMemo(() => {
    if (currentMetrics.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    const clicks = currentMetrics.reduce((s, m) => s + m.clicks, 0)
    const impressions = currentMetrics.reduce((s, m) => s + m.impressions, 0)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const position = currentMetrics.reduce((s, m) => s + Number(m.position), 0) / currentMetrics.length
    return { clicks, impressions, ctr, position }
  }, [currentMetrics])

  const trackedKeywords = useMemo(() => (keywords ?? []).filter((k) => k.tracked), [keywords])

  const trendData = useMemo(() => {
    if (!metrics) return []
    const months = Array.from(new Set(metrics.map((m) => m.month))).sort()
    return months.map((month) => {
      const row: Record<string, string | number> = { month: monthLabel(month.slice(0, 7)) }
      trackedKeywords.forEach((k) => {
        const entry = metrics.find((m) => m.keyword_id === k.id && m.month === month)
        if (entry) row[k.keyword] = Number(entry.position)
      })
      return row
    })
  }, [metrics, trackedKeywords])

  if (loadingKeywords || loadingMetrics) {
    return <p className="font-sans text-sm text-gray-400">Carregando dados de SEO...</p>
  }

  return (
    <div className="space-y-5">
      {/* Status de conexão */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connection?.connected ? 'bg-verde-pale' : 'bg-amarelo-pale'}`}>
            <Search size={18} className={connection?.connected ? 'text-verde-vivid' : 'text-amarelo-vivid'} />
          </div>
          <div>
            <p className="font-sans font-semibold text-sm text-gray-800">
              {connection?.connected ? 'Google Search Console conectado' : 'Google Search Console não conectado'}
            </p>
            <p className="font-sans text-xs text-gray-400">
              {connection?.connected ? 'Dados sincronizados automaticamente' : 'Conecte a API (Fase 2) ou registre métricas manualmente'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!connection?.connected && (
            <button className="px-4 py-2 rounded-lg font-sans font-semibold text-sm border border-areia-warm text-gray-600 hover:bg-areia">
              Conectar Search Console
            </button>
          )}
          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid"
          >
            Adicionar métricas manualmente
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={MousePointerClick} label="Cliques" value={formatNumber(kpis.clicks)} />
        <KPICard icon={Eye} label="Impressões" value={formatNumber(kpis.impressions)} />
        <KPICard icon={Percent} label="CTR médio" value={formatPercent(kpis.ctr)} />
        <KPICard icon={ArrowUpDown} label="Posição média" value={kpis.position.toFixed(1)} />
      </div>

      {/* Top keywords */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-serif text-lg text-gray-900">Top Palavras-chave {latestMonth ? `— ${monthLabel(latestMonth.slice(0, 7))}` : ''}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5">Palavra-chave</th>
                <th className="px-5 py-2.5 text-right">Cliques</th>
                <th className="px-5 py-2.5 text-right">Impressões</th>
                <th className="px-5 py-2.5 text-right">CTR</th>
                <th className="px-5 py-2.5 text-right">Posição</th>
              </tr>
            </thead>
            <tbody>
              {currentMetrics.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Sem dados de SEO.</td></tr>
              ) : [...currentMetrics].sort((a, b) => b.clicks - a.clicks).map((m) => {
                const kw = (keywords ?? []).find((k) => k.id === m.keyword_id)
                return (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-800 font-semibold">{kw?.keyword ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700">{formatNumber(m.clicks)}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700">{formatNumber(m.impressions)}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700">{formatPercent(m.ctr)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{Number(m.position).toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Palavras-chave estratégicas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="font-serif text-lg text-gray-900">Palavras-chave Estratégicas</p>
          <button
            onClick={() => setShowKeywordModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-rosa-vivid text-white hover:bg-rosa-mid"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
        <div className="p-5 flex flex-wrap gap-2">
          {trackedKeywords.length === 0 ? (
            <p className="font-sans text-sm text-gray-400">Nenhuma palavra-chave monitorada.</p>
          ) : trackedKeywords.map((k) => (
            <span key={k.id} className="font-sans text-xs font-semibold px-3 py-1.5 rounded-full bg-verde-pale text-verde-vivid">
              {k.keyword}
            </span>
          ))}
        </div>
      </div>

      {/* Tendência de posição */}
      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-3">Tendência de Posição — Palavras-chave Monitoradas</p>
        <p className="font-sans text-xs text-gray-400 mb-3">Valores menores indicam melhor posicionamento (1 = primeiro resultado).</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis reversed tick={{ fontSize: 11, fill: '#9CA3AF' }} width={40} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Barlow Condensed' }} />
            {trackedKeywords.map((k, i) => (
              <Line key={k.id} type="monotone" dataKey={k.keyword} name={k.keyword} stroke={KEYWORD_COLORS[i % KEYWORD_COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <AddKeywordModal open={showKeywordModal} onClose={() => setShowKeywordModal(false)} />
      <ManualSEOModal open={showManualModal} onClose={() => setShowManualModal(false)} keywords={keywords ?? []} />
    </div>
  )
}
