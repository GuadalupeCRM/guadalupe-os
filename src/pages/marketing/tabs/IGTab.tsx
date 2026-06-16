import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Instagram, Users, TrendingUp, Heart, Eye, Megaphone, Plus, CheckCircle2, Circle } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { WEEKLY_CONTENT_GOAL, IG_POST_TYPE_LABELS } from '../constants'
import {
  useIGMetrics, useIGPosts, useIGCompetitors, useIGConnectionStatus,
  useCreateIGMetric, useCreateIGCompetitor,
} from '../../../hooks/useMarketing'
import { formatNumber, formatPercent, formatDate } from '../../../utils/formatters'
import type { IGPostType } from '../../../types'

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const COMPETITOR_COLORS = ['#FAAE1A', '#E21655', '#6BB42E', '#A2C96C']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ============================================================
// KPI ROW
// ============================================================
function KPICard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-verde-pale flex items-center justify-center">
          <Icon size={14} className="text-verde-vivid" />
        </div>
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <p className="font-serif text-3xl text-gray-900">{value}</p>
      {sub && <p className="font-sans text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ============================================================
// FORM — ADICIONAR MÉTRICAS MANUALMENTE
// ============================================================
const metricSchema = z.object({
  week_start: z.string().min(1, 'Informe a data de início da semana'),
  followers: z.coerce.number().int().min(0),
  follower_growth: z.coerce.number().int(),
  reach: z.coerce.number().int().min(0),
  impressions: z.coerce.number().int().min(0),
  posts_count: z.coerce.number().int().min(0),
  reels_count: z.coerce.number().int().min(0),
  stories_count: z.coerce.number().int().min(0),
  likes: z.coerce.number().int().min(0),
  comments: z.coerce.number().int().min(0),
  saves: z.coerce.number().int().min(0),
})

type MetricForm = z.infer<typeof metricSchema>

function ManualMetricsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MetricForm>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      week_start: '', followers: undefined as unknown as number, follower_growth: undefined as unknown as number,
      reach: undefined as unknown as number, impressions: undefined as unknown as number,
      posts_count: undefined as unknown as number, reels_count: undefined as unknown as number, stories_count: undefined as unknown as number,
      likes: undefined as unknown as number, comments: undefined as unknown as number, saves: undefined as unknown as number,
    },
  })
  const createMetric = useCreateIGMetric()

  const onSubmit = async (values: MetricForm) => {
    try {
      const engagement_rate = values.impressions > 0
        ? ((values.likes + values.comments + values.saves) / values.impressions) * 100
        : 0
      await createMetric.mutateAsync({ ...values, engagement_rate })
      toast.success('Métricas salvas')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao salvar métricas')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Métricas — Instagram" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Semana (início — segunda-feira)</label>
          <input type="date" {...register('week_start')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.week_start && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.week_start.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Seguidores</label>
            <input type="number" {...register('followers')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Crescimento na semana</label>
            <input type="number" {...register('follower_growth')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Alcance</label>
            <input type="number" {...register('reach')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Impressões</label>
            <input type="number" {...register('impressions')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Posts</label>
            <input type="number" {...register('posts_count')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Reels</label>
            <input type="number" {...register('reels_count')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Stories</label>
            <input type="number" {...register('stories_count')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Curtidas</label>
            <input type="number" {...register('likes')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Comentários</label>
            <input type="number" {...register('comments')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Salvamentos</label>
            <input type="number" {...register('saves')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
        </div>
        <p className="font-sans text-xs text-gray-400">Engajamento (%) = (curtidas + comentários + salvamentos) / impressões × 100 — calculado automaticamente.</p>
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
// FORM — ADICIONAR CONCORRENTE
// ============================================================
const competitorSchema = z.object({
  account: z.string().min(1, 'Informe a conta'),
  followers: z.coerce.number().int().min(0),
  posts_per_week: z.coerce.number().min(0),
  engagement_rate: z.coerce.number().min(0),
  week_start: z.string().min(1, 'Informe a semana'),
})

type CompetitorForm = z.infer<typeof competitorSchema>

function AddCompetitorModal({ open, onClose, defaultWeekStart }: { open: boolean; onClose: () => void; defaultWeekStart: string }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompetitorForm>({
    resolver: zodResolver(competitorSchema),
    defaultValues: {
      account: '', followers: undefined as unknown as number, posts_per_week: undefined as unknown as number,
      engagement_rate: undefined as unknown as number, week_start: defaultWeekStart,
    },
  })
  const createCompetitor = useCreateIGCompetitor()

  const onSubmit = async (values: CompetitorForm) => {
    try {
      await createCompetitor.mutateAsync(values)
      toast.success('Concorrente atualizado')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Dados de Concorrente">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Conta (@usuario)</label>
          <input type="text" {...register('account')} placeholder="@concorrente" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.account && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.account.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Seguidores</label>
            <input type="number" {...register('followers')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Posts/semana</label>
            <input type="number" step="0.1" {...register('posts_per_week')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Engajamento (%)</label>
            <input type="number" step="0.01" {...register('engagement_rate')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Semana</label>
            <input type="date" {...register('week_start')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
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
export default function IGTab() {
  const { data: connection } = useIGConnectionStatus()
  const { data: metrics, isLoading: loadingMetrics } = useIGMetrics()
  const { data: posts, isLoading: loadingPosts } = useIGPosts()
  const { data: competitors, isLoading: loadingCompetitors } = useIGCompetitors()
  const [showMetricsModal, setShowMetricsModal] = useState(false)
  const [showCompetitorModal, setShowCompetitorModal] = useState(false)

  const latest = useMemo(() => (metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null), [metrics])

  const weekDays = useMemo(() => {
    if (!latest) return []
    return Array.from({ length: 7 }, (_, i) => addDays(latest.week_start, i))
  }, [latest])

  const weekPosts = useMemo(() => {
    if (!latest || !posts) return []
    const start = latest.week_start
    const end = addDays(latest.week_start, 6)
    return posts.filter((p) => p.date >= start && p.date <= end)
  }, [latest, posts])

  const weekCounts = useMemo(() => {
    const counts: Record<IGPostType, number> = { post: 0, reel: 0, story: 0 }
    weekPosts.forEach((p) => { counts[p.type] += 1 })
    return counts
  }, [weekPosts])

  const topPosts = useMemo(() => {
    if (!posts || !latest) return []
    const monthPrefix = latest.week_start.slice(0, 7)
    return [...posts]
      .filter((p) => p.date.startsWith(monthPrefix) && p.type !== 'story')
      .sort((a, b) => b.engagement_rate - a.engagement_rate)
      .slice(0, 3)
  }, [posts, latest])

  const latestCompetitors = useMemo(() => {
    if (!competitors) return []
    const byAccount = new Map<string, typeof competitors[number]>()
    competitors.forEach((c) => {
      const cur = byAccount.get(c.account)
      if (!cur || c.week_start > cur.week_start) byAccount.set(c.account, c)
    })
    return Array.from(byAccount.values())
  }, [competitors])

  const benchmarkData = useMemo(() => {
    if (!metrics) return []
    const accounts = Array.from(new Set((competitors ?? []).map((c) => c.account)))
    return metrics.map((m) => {
      const row: Record<string, string | number> = {
        week: formatDate(m.week_start),
        guadalupe: Number(m.engagement_rate),
      }
      accounts.forEach((acc) => {
        const entry = (competitors ?? []).find((c) => c.account === acc && c.week_start === m.week_start)
        if (entry) row[acc] = Number(entry.engagement_rate)
      })
      return row
    })
  }, [metrics, competitors])

  const competitorAccounts = useMemo(() => Array.from(new Set((competitors ?? []).map((c) => c.account))), [competitors])

  if (loadingMetrics || loadingPosts || loadingCompetitors || !latest) {
    return <p className="font-sans text-sm text-gray-400">Carregando métricas do Instagram...</p>
  }

  return (
    <div className="space-y-5">
      {/* Status de conexão */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connection?.connected ? 'bg-verde-pale' : 'bg-amarelo-pale'}`}>
            <Instagram size={18} className={connection?.connected ? 'text-verde-vivid' : 'text-amarelo-vivid'} />
          </div>
          <div>
            <p className="font-sans font-semibold text-sm text-gray-800">
              {connection?.connected ? 'Conta Instagram conectada' : 'Conta Instagram não conectada'}
            </p>
            <p className="font-sans text-xs text-gray-400">
              {connection?.connected ? '@guadalupe.drink' : 'Conecte a API do Instagram (Fase 2) ou registre métricas manualmente'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!connection?.connected && (
            <button className="px-4 py-2 rounded-lg font-sans font-semibold text-sm border border-areia-warm text-gray-600 hover:bg-areia">
              Conectar conta
            </button>
          )}
          <button
            onClick={() => setShowMetricsModal(true)}
            className="px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid"
          >
            Adicionar métricas manualmente
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard icon={Users} label="Seguidores" value={formatNumber(latest.followers)} sub={formatDate(latest.week_start)} />
        <KPICard icon={TrendingUp} label="Crescimento semana" value={`+${formatNumber(latest.follower_growth)}`} />
        <KPICard icon={Heart} label="Engajamento" value={formatPercent(latest.engagement_rate)} />
        <KPICard icon={Eye} label="Alcance" value={formatNumber(latest.reach)} />
        <KPICard icon={Megaphone} label="Impressões" value={formatNumber(latest.impressions)} />
      </div>

      {/* Frequência de publicação */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-1">Frequência de Conteúdo</h3>
        <p className="font-sans text-xs text-gray-400 mb-4">
          Meta: {WEEKLY_CONTENT_GOAL.posts} posts + {WEEKLY_CONTENT_GOAL.reels} reels + {WEEKLY_CONTENT_GOAL.stories} stories/semana
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { key: 'post', label: 'Posts', goal: WEEKLY_CONTENT_GOAL.posts, actual: weekCounts.post },
            { key: 'reel', label: 'Reels', goal: WEEKLY_CONTENT_GOAL.reels, actual: weekCounts.reel },
            { key: 'story', label: 'Stories', goal: WEEKLY_CONTENT_GOAL.stories, actual: weekCounts.story },
          ] as const).map((item) => (
            <div key={item.key} className="bg-areia border border-gray-200 rounded-xl p-4">
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{item.label}</p>
              <p className="font-serif text-2xl text-gray-900 mb-2">{item.actual} / {item.goal}</p>
              <div className="flex gap-1">
                {Array.from({ length: item.goal }, (_, i) => (
                  i < item.actual
                    ? <CheckCircle2 key={i} size={18} className="text-verde-vivid" />
                    : <Circle key={i} size={18} className="text-gray-300" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendário de conteúdo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-4">Calendário de Conteúdo — Semana de {formatDate(latest.week_start)}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          {weekDays.map((day, i) => {
            const dayPosts = weekPosts.filter((p) => p.date === day)
            return (
              <div key={day} className="border border-areia-warm rounded-lg p-3 min-h-[120px]">
                <p className="font-sans text-xs font-semibold text-gray-400 uppercase tracking-wider">{WEEKDAY_LABELS[i]}</p>
                <p className="font-sans text-xs text-gray-400 mb-2">{formatDate(day)}</p>
                {dayPosts.length === 0 ? (
                  <p className="font-sans text-xs text-gray-300">—</p>
                ) : (
                  <div className="space-y-2">
                    {dayPosts.map((p) => (
                      <div key={p.id}>
                        <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          p.type === 'reel' ? 'bg-rosa-pale text-rosa-vivid' : p.type === 'post' ? 'bg-verde-pale text-verde-vivid' : 'bg-amarelo-pale text-amarelo-vivid'
                        }`}>
                          {IG_POST_TYPE_LABELS[p.type]}
                        </span>
                        <p className="font-sans text-xs text-gray-700 mt-1 line-clamp-2">{p.title}</p>
                        <p className="font-sans text-[11px] text-gray-400 mt-0.5">{formatPercent(p.engagement_rate)} eng.</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Top posts do mês */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-serif text-lg text-gray-900 mb-4">Top Posts do Mês</h3>
        {topPosts.length === 0 ? (
          <p className="font-sans text-sm text-gray-400">Sem posts registrados neste mês.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topPosts.map((p, i) => (
              <div key={p.id} className="bg-areia border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    p.type === 'reel' ? 'bg-rosa-pale text-rosa-vivid' : 'bg-verde-pale text-verde-vivid'
                  }`}>
                    {IG_POST_TYPE_LABELS[p.type]}
                  </span>
                  <span className="font-serif text-lg text-gray-400">#{i + 1}</span>
                </div>
                <p className="font-sans text-sm text-gray-800 font-semibold line-clamp-2">{p.title}</p>
                <p className="font-sans text-xs text-gray-400 mt-1">{formatDate(p.date)}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 font-sans text-xs">
                  <div><span className="text-gray-400">Engajamento</span><p className="font-bold text-gray-900">{formatPercent(p.engagement_rate)}</p></div>
                  <div><span className="text-gray-400">Alcance</span><p className="font-bold text-gray-900">{formatNumber(p.reach)}</p></div>
                  <div><span className="text-gray-400">Curtidas</span><p className="font-bold text-gray-900">{formatNumber(p.likes)}</p></div>
                  <div><span className="text-gray-400">Salvamentos</span><p className="font-bold text-gray-900">{formatNumber(p.saves)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comparação com concorrentes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-serif text-lg text-gray-900">Comparação com Concorrentes</p>
            <p className="font-sans text-xs text-gray-400">Atualização manual — adicionar dados dos concorrentes aqui mensalmente.</p>
          </div>
          <button
            onClick={() => setShowCompetitorModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-rosa-vivid text-white hover:bg-rosa-mid"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5">Conta</th>
                <th className="px-5 py-2.5 text-right">Seguidores</th>
                <th className="px-5 py-2.5 text-right">Posts/semana</th>
                <th className="px-5 py-2.5 text-right">Engajamento %</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 bg-verde-pale/40">
                <td className="px-5 py-2.5 font-semibold text-gray-800">@guadalupe.drink</td>
                <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{formatNumber(latest.followers)}</td>
                <td className="px-5 py-2.5 text-right text-gray-700">{latest.posts_count + latest.reels_count}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-verde-vivid">{formatPercent(latest.engagement_rate)}</td>
              </tr>
              {latestCompetitors.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-4 text-center text-gray-400">Nenhum concorrente cadastrado.</td></tr>
              ) : latestCompetitors.map((c) => (
                <tr key={c.account} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800">{c.account}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{formatNumber(c.followers)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{c.posts_per_week}</td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{formatPercent(c.engagement_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benchmark semanal */}
      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-3">Benchmark Semanal — Engajamento (%)</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={benchmarkData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={50} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Barlow Condensed' }} />
            <Line type="monotone" dataKey="guadalupe" name="@guadalupe.drink" stroke="#E21655" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            {competitorAccounts.map((acc, i) => (
              <Line key={acc} type="monotone" dataKey={acc} name={acc} stroke={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ManualMetricsModal open={showMetricsModal} onClose={() => setShowMetricsModal(false)} />
      <AddCompetitorModal open={showCompetitorModal} onClose={() => setShowCompetitorModal(false)} defaultWeekStart={latest.week_start} />
    </div>
  )
}
