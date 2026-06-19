import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProjectionRow {
  metric_key: string
  projected_value: number
}

export interface NominalActuals {
  leadsNovos: number
  conversoes: number
  eventos: number
  ugcs: number
}

export interface MRRMonthData {
  month: string
  mrr: number
  newCustomers: number
  returningCustomers: number
  churnCount: number
  retentionRate: number
}

export interface ChannelTrendMonth {
  month: string
  [canal: string]: number | string
}

export interface ClosingRecord {
  id: string
  title: string
  message: string
  created_at: string
  metadata: Record<string, unknown>
}

// ── Monthly Projections ────────────────────────────────────────────────────

export function useMonthlyProjections(month: string) {
  return useQuery({
    queryKey: ['monthly_projections', month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_projections')
        .select('metric_key, projected_value')
        .eq('month', month + '-01')
      if (error) throw error
      const map: Record<string, number> = {}
      for (const row of data ?? []) {
        map[row.metric_key] = Number(row.projected_value)
      }
      return map
    },
    staleTime: 60_000,
  })
}

export function useSaveProjections() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ month, projections }: { month: string; projections: ProjectionRow[] }) => {
      const rows = projections.map((p) => ({
        month: month + '-01',
        metric_key: p.metric_key,
        projected_value: p.projected_value,
      }))
      const { error } = await supabase
        .from('monthly_projections')
        .upsert(rows, { onConflict: 'month,metric_key' })
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['monthly_projections', v.month] })
    },
  })
}

// ── Nominal Actuals (leads / eventos / ugcs) ───────────────────────────────

export function useNominalActuals(month: string) {
  return useQuery({
    queryKey: ['nominal_actuals', month],
    queryFn: async () => {
      const start = month + '-01'
      const [y, m] = month.split('-').map(Number)
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

      const [leadsRes, conversoesRes, eventsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lt('created_at', nextMonth),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .gte('first_order_at', start)
          .lt('first_order_at', nextMonth),
        supabase
          .from('events')
          .select('ugc_count')
          .gte('event_date', start)
          .lt('event_date', nextMonth)
          .eq('stage', 'finalizado'),
      ])

      const eventos = eventsRes.data?.length ?? 0
      const ugcs = (eventsRes.data ?? []).reduce((s, e) => s + (e.ugc_count ?? 0), 0)

      return {
        leadsNovos: leadsRes.count ?? 0,
        conversoes: conversoesRes.count ?? 0,
        eventos,
        ugcs,
      } as NominalActuals
    },
    staleTime: 60_000,
  })
}

// ── MRR from shopify_orders ────────────────────────────────────────────────

export function useMRR() {
  return useQuery({
    queryKey: ['mrr_6m'],
    queryFn: async () => {
      const now = new Date()
      const months: MRRMonthData[] = []

      // Build 6-month range
      const ranges: { label: string; start: string; end: string }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toISOString().slice(0, 7)
        const y = d.getFullYear()
        const mo = d.getMonth()
        const nextD = new Date(y, mo + 1, 1)
        ranges.push({
          label,
          start: d.toISOString().slice(0, 10),
          end: nextD.toISOString().slice(0, 10),
        })
      }

      // Check if table exists (graceful fallback)
      const { error: checkErr } = await supabase
        .from('shopify_orders')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      if (checkErr) return [] as MRRMonthData[]

      // Fetch all orders in the 6-month window
      const { data: orders } = await supabase
        .from('shopify_orders')
        .select('email, total_price, created_at')
        .gte('created_at', ranges[0].start)
        .lt('created_at', ranges[5].end)

      if (!orders || orders.length === 0) return [] as MRRMonthData[]

      // Build per-month MRR using email as customer identifier
      const emailFirstOrder: Record<string, string> = {}
      for (const o of orders) {
        const month = (o.created_at as string).slice(0, 7)
        if (!emailFirstOrder[o.email] || month < emailFirstOrder[o.email]) {
          emailFirstOrder[o.email] = month
        }
      }

      // Previous month customer set (for churn)
      let prevMonthEmails = new Set<string>()

      for (const r of ranges) {
        const monthOrders = orders.filter(
          (o) =>
            (o.created_at as string) >= r.start && (o.created_at as string) < r.end,
        )
        const mrr = monthOrders.reduce((s, o) => s + Number(o.total_price ?? 0), 0)

        const monthEmails = new Set(monthOrders.map((o) => o.email as string))
        const newCustomers = [...monthEmails].filter(
          (e) => emailFirstOrder[e] === r.label,
        ).length
        const returningCustomers = monthEmails.size - newCustomers
        const churnCount =
          prevMonthEmails.size > 0
            ? [...prevMonthEmails].filter((e) => !monthEmails.has(e)).length
            : 0
        const retentionRate =
          prevMonthEmails.size > 0
            ? Math.round(((prevMonthEmails.size - churnCount) / prevMonthEmails.size) * 100)
            : 100

        months.push({
          month: r.label,
          mrr,
          newCustomers,
          returningCustomers,
          churnCount,
          retentionRate,
        })
        prevMonthEmails = monthEmails
      }

      return months
    },
    staleTime: 300_000,
  })
}

// ── Channel Trends (6 months) ──────────────────────────────────────────────

export function useChannelTrends() {
  return useQuery({
    queryKey: ['channel_trends_6m'],
    queryFn: async () => {
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

      const { data, error } = await supabase
        .from('channel_revenue')
        .select('week_start, canal, net_margin, revenue')
        .gte('week_start', sixMonthsAgo.toISOString().slice(0, 10))
        .order('week_start')
      if (error) throw error

      // Aggregate by month
      const byMonth: Record<string, Record<string, { margin: number; revenue: number }>> = {}
      for (const row of data ?? []) {
        const month = (row.week_start as string).slice(0, 7)
        if (!byMonth[month]) byMonth[month] = {}
        if (!byMonth[month][row.canal]) byMonth[month][row.canal] = { margin: 0, revenue: 0 }
        byMonth[month][row.canal].margin += Number(row.net_margin ?? 0)
        byMonth[month][row.canal].revenue += Number(row.revenue ?? 0)
      }

      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, canais]) => ({ month, ...canais }))
    },
    staleTime: 300_000,
  })
}

// ── Monthly Closings history (from agent_insights) ─────────────────────────

export function useMonthClosings() {
  return useQuery({
    queryKey: ['month_closings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_insights')
        .select('id, title, message, created_at, metadata')
        .eq('agent_name', 'agent-dre-generator')
        .order('created_at', { ascending: false })
        .limit(12)
      if (error) throw error
      return (data ?? []) as ClosingRecord[]
    },
    staleTime: 300_000,
  })
}

// ── Trigger DRE agent ──────────────────────────────────────────────────────

export function useTriggerDREAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const res = await fetch(`${supabaseUrl}/functions/v1/agent-dre-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `HTTP ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['month_closings'] })
    },
  })
}

// ── Closing status (stored as fechamento_status in monthly_projections) ────

export function useClosingStatus(month: string) {
  const { data: proj } = useMonthlyProjections(month)
  return (proj?.fechamento_status ?? 0) as 0 | 1 | 2
}

export function useSetClosingStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ month, status }: { month: string; status: 0 | 1 | 2 }) => {
      const { error } = await supabase.from('monthly_projections').upsert(
        [{ month: month + '-01', metric_key: 'fechamento_status', projected_value: status }],
        { onConflict: 'month,metric_key' },
      )
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['monthly_projections', v.month] })
    },
  })
}
