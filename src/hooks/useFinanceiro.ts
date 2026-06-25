import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { FIXED_COSTS_MONTHLY } from '../constants/business'
import type {
  CashEntry, CashEntryCategory, CashEntryType, ChannelRevenue,
  CMVHistoryEntry, BlingNF, SKUType, CanaisType, AgentInsight,
} from '../types'

// ============================================================
// Helpers
// ============================================================
function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // YYYY-MM
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ============================================================
// CAIXA
// ============================================================
export interface CashEntryWithBalance extends CashEntry {
  balance: number
}

export interface CashFlowData {
  entries: CashEntry[]
  entriesWithBalance: CashEntryWithBalance[]
  currentBalance: number
  last30: { date: string; balance: number }[]
  last10: CashEntryWithBalance[]
  monthly: {
    totalEntradas: number
    totalSaidas: number
    saldoLiquido: number
    saldoAnterior: number
    variacaoPct: number | null
  }
}

export function useCashFlow() {
  return useQuery({
    queryKey: ['cash-entries'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<CashFlowData> => {
      const { data, error } = await supabase
        .from('cash_entries')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      const entries = (data ?? []) as CashEntry[]

      let running = 0
      const entriesWithBalance: CashEntryWithBalance[] = entries.map((e) => {
        running += e.type === 'entrada' ? Number(e.value) : -Number(e.value)
        return { ...e, balance: running }
      })
      const currentBalance = running

      // Daily balance curve (last 30 days) — last balance recorded per day
      const byDate = new Map<string, number>()
      entriesWithBalance.forEach((e) => byDate.set(e.date, e.balance))
      const sortedDates = Array.from(byDate.keys()).sort()
      const last30Dates = sortedDates.slice(-30)
      const last30 = last30Dates.map((date) => ({ date, balance: byDate.get(date) ?? 0 }))

      const last10 = [...entriesWithBalance].slice(-10).reverse()

      // Monthly summary
      const curMonth = currentMonthKey()
      const prevMonth = shiftMonth(curMonth, -1)
      const sumFor = (monthKey: string) => {
        const inMonth = entries.filter((e) => toMonthKey(e.date) === monthKey)
        const totalEntradas = inMonth.filter((e) => e.type === 'entrada').reduce((s, e) => s + Number(e.value), 0)
        const totalSaidas = inMonth.filter((e) => e.type === 'saida').reduce((s, e) => s + Number(e.value), 0)
        return { totalEntradas, totalSaidas, saldoLiquido: totalEntradas - totalSaidas }
      }
      const cur = sumFor(curMonth)
      const prev = sumFor(prevMonth)
      const variacaoPct = prev.saldoLiquido !== 0
        ? ((cur.saldoLiquido - prev.saldoLiquido) / Math.abs(prev.saldoLiquido)) * 100
        : null

      return {
        entries,
        entriesWithBalance,
        currentBalance,
        last30,
        last10,
        monthly: {
          totalEntradas: cur.totalEntradas,
          totalSaidas: cur.totalSaidas,
          saldoLiquido: cur.saldoLiquido,
          saldoAnterior: prev.saldoLiquido,
          variacaoPct,
        },
      }
    },
  })
}

export function useCreateCashEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: {
      date: string
      type: CashEntryType
      category: CashEntryCategory
      value: number
      description?: string
    }) => {
      const { error } = await supabase.from('cash_entries').insert(entry)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-entries'] })
    },
  })
}

// ============================================================
// DRE
// ============================================================
export interface DRELines {
  receitaBruta: number
  cmvTotal: number
  lucroBruto: number
  lucroBrutoPct: number
  custosCanal: number
  margemContribuicao: number
  margemContribuicaoPct: number
  custosFixos: number
  resultadoOperacional: number
  resultadoOperacionalPct: number
}

export interface DREData {
  month: string
  current: DRELines
  breakeven: { target: number; progressPct: number; diff: number }
  history: { month: string; label: string; lines: DRELines }[]
}

interface FnMcFromNfs {
  total_latas: number
  total_receita: number
  total_cmv: number
  mc_total: number
  mc_por_lata: number
  breakeven_pct: number
  fixed_costs: number
  latas_para_break: number
  periodo_from: string
  periodo_to: string
}

function monthBounds(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split('-').map(Number)
  const from = `${monthKey}-01`
  const isCurrent = monthKey === currentMonthKey()
  const lastDay = new Date(y, m, 0).toISOString().slice(0, 10)
  const to = isCurrent ? new Date().toISOString().slice(0, 10) : lastDay
  return { from, to }
}

function linesFromMc(mc: FnMcFromNfs): DRELines {
  const receitaBruta = Number(mc.total_receita ?? 0)
  const cmvTotal = Number(mc.total_cmv ?? 0)
  const lucroBruto = receitaBruta - cmvTotal
  const custosCanal = 0 // não rastreado por fn_mc_from_nfs (sem granularidade de frete/mão de obra)
  const margemContribuicao = Number(mc.mc_total ?? lucroBruto)
  const custosFixos = Number(mc.fixed_costs ?? FIXED_COSTS_MONTHLY)
  const resultadoOperacional = margemContribuicao - custosFixos
  const pct = (v: number) => (receitaBruta === 0 ? 0 : (v / receitaBruta) * 100)
  return {
    receitaBruta,
    cmvTotal,
    lucroBruto,
    lucroBrutoPct: pct(lucroBruto),
    custosCanal,
    margemContribuicao,
    margemContribuicaoPct: pct(margemContribuicao),
    custosFixos,
    resultadoOperacional,
    resultadoOperacionalPct: pct(resultadoOperacional),
  }
}

export function useDRE(month: string = currentMonthKey()) {
  return useQuery({
    queryKey: ['dre', month],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DREData> => {
      // Mês selecionado + 3 meses anteriores, cada um via fn_mc_from_nfs (dados reais das NFs)
      const months = [shiftMonth(month, -3), shiftMonth(month, -2), shiftMonth(month, -1), month]

      const results = await Promise.all(
        months.map(async (m) => {
          const { from, to } = monthBounds(m)
          const { data, error } = await supabase.rpc('fn_mc_from_nfs', { p_from: from, p_to: to })
          if (error) throw error
          return { month: m, label: monthLabel(m), lines: linesFromMc(data as FnMcFromNfs) }
        })
      )

      const current = results[results.length - 1].lines
      const breakeven = {
        target: current.custosFixos,
        progressPct: Math.min((current.margemContribuicao / current.custosFixos) * 100, 100),
        diff: current.margemContribuicao - current.custosFixos,
      }

      return { month, current, breakeven, history: results }
    },
  })
}

// ============================================================
// CMV POR SKU
// ============================================================
export interface CMVSkuSummary {
  sku: SKUType
  current: number
  lastUpdated: string
  pctChange: number | null
  history: CMVHistoryEntry[]
  chartData: { month: string; label: string; value: number }[]
}

export interface CMVData {
  bySku: CMVSkuSummary[]
  allHistory: CMVHistoryEntry[]
}

interface CMVComponentRow {
  sku: SKUType
  value: number
  updated_at: string
}

export function useCMVHistory() {
  return useQuery({
    queryKey: ['cmv-history'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CMVData> => {
      const [historyRes, componentsRes] = await Promise.all([
        supabase.from('cmv_history').select('*').order('month', { ascending: false }),
        supabase.from('cmv_components').select('sku, value, updated_at'),
      ])
      if (historyRes.error) throw historyRes.error
      if (componentsRes.error) throw componentsRes.error
      const allHistory = (historyRes.data ?? []) as CMVHistoryEntry[]
      const components = (componentsRes.data ?? []) as CMVComponentRow[]

      const skus: SKUType[] = ['mango_sour', 'margarita_lime', 'paloma_grapefruit']
      const bySku = skus.map((sku) => {
        const history = allHistory.filter((h) => h.sku === sku)
        const skuComponents = components.filter((c) => c.sku === sku)
        // Fonte de verdade do CMV atual por lata: soma dos componentes (cmv_components)
        const current = skuComponents.reduce((s, c) => s + Number(c.value), 0)
        const lastUpdated = skuComponents
          .reduce((latest, c) => (c.updated_at > latest ? c.updated_at : latest), skuComponents[0]?.updated_at ?? '')
          .slice(0, 10)
        const previous = history[0]
        const pctChange = previous && Number(previous.cmv_value) !== 0
          ? ((current - Number(previous.cmv_value)) / Number(previous.cmv_value)) * 100
          : null
        const chartData = [...history].slice(0, 6).reverse().map((h) => ({
          month: h.month,
          label: monthLabel(toMonthKey(h.month)),
          value: Number(h.cmv_value),
        }))
        return {
          sku,
          current,
          lastUpdated,
          pctChange,
          history,
          chartData,
        }
      })

      return { bySku, allHistory }
    },
  })
}

export function useCreateCMVEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: {
      sku: SKUType
      cmv_value: number
      previous_value?: number
      reason: string
      bling_nf_ref?: string
    }) => {
      const month = `${currentMonthKey()}-01`
      const { error } = await supabase.from('cmv_history').insert({ ...entry, month })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmv-history'] })
    },
  })
}

// ============================================================
// AGENT INSIGHTS
// ============================================================
export function useAgentInsights() {
  return useQuery({
    queryKey: ['agent-insights'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AgentInsight[]> => {
      const { data, error } = await supabase
        .from('agent_insights')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AgentInsight[]
    },
  })
}

// ============================================================
// NFs BLING
// ============================================================
export interface BlingNFFilters {
  startDate?: string
  endDate?: string
  canal?: string
  status?: string
  search?: string
}

export interface BlingNFData {
  nfs: BlingNF[]
  lastSync: string | null
  statsByCanal: { canal: string; count: number; total: number }[]
}

export function useBlingNFs(filters: BlingNFFilters = {}) {
  return useQuery({
    queryKey: ['bling-nfs', filters],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<BlingNFData> => {
      let query = supabase.from('bling_nfs').select('*')
      if (filters.startDate) query = query.gte('data', filters.startDate)
      if (filters.endDate) query = query.lte('data', filters.endDate)
      if (filters.canal && filters.canal !== 'todos') {
        if (filters.canal === 'sem_canal') query = query.is('canal', null)
        else query = query.eq('canal', filters.canal)
      }
      if (filters.status && filters.status !== 'todos') query = query.eq('status', filters.status)
      if (filters.search) {
        query = query.or(`cliente.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%,nf_number.ilike.%${filters.search}%`)
      }
      const { data, error } = await query.order('data', { ascending: false })
      if (error) throw error
      const nfs = (data ?? []) as BlingNF[]

      const lastSync = nfs.length
        ? nfs.reduce((latest, n) => (n.synced_at > latest ? n.synced_at : latest), nfs[0].synced_at)
        : null

      // Stats por canal for current month
      const curMonth = currentMonthKey()
      const monthNfs = nfs.filter((n) => toMonthKey(n.data) === curMonth && n.status !== 'cancelada')
      const canalMap = new Map<string, { count: number; total: number }>()
      monthNfs.forEach((n) => {
        const key = n.canal ?? 'sem_canal'
        const cur = canalMap.get(key) ?? { count: 0, total: 0 }
        cur.count += 1
        cur.total += Number(n.valor)
        canalMap.set(key, cur)
      })
      const statsByCanal = Array.from(canalMap.entries()).map(([canal, v]) => ({ canal, ...v }))

      return { nfs, lastSync, statsByCanal }
    },
  })
}

export function useSyncBlingNFs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Placeholder: integração real com Bling será feita via webhook/agente
      await new Promise((r) => setTimeout(r, 800))
      return { syncedAt: new Date().toISOString() }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bling-nfs'] })
    },
  })
}

export function useCorrectNFCanal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, canal }: { id: string; canal: CanaisType }) => {
      const { error } = await supabase.from('bling_nfs').update({ canal }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bling-nfs'] })
    },
  })
}

// ============================================================
// MARGENS POR CANAL
// ============================================================
export interface ChannelMarginRow {
  canal: CanaisType
  revenue: number
  cmv: number
  freight: number
  labor: number
  materials: number
  other: number
  netMargin: number
  netMarginPct: number
  unitsSold: number
  unitsToBreakeven: number
}

export interface ChannelMarginsData {
  rows: ChannelMarginRow[]
  mostProfitable: ChannelMarginRow | null
  lossChannels: ChannelMarginRow[]
  totalRevenue: number
}

interface BlingNFItemRow {
  codigo?: string
  quantidade?: number
  valor?: number
}

function matchSkuCmv(codigo: string, cmvBySku: Record<string, number>): number | null {
  if (/^GDMS|^GUA-MS/.test(codigo)) return cmvBySku.mango_sour ?? null
  if (/^GDML|^GUA-MAR/.test(codigo)) return cmvBySku.margarita_lime ?? null
  if (/^GDPG|^GUA-PAL/.test(codigo)) return cmvBySku.paloma_grapefruit ?? null
  if (/^GDMIX/.test(codigo)) {
    const vals = [cmvBySku.mango_sour, cmvBySku.margarita_lime, cmvBySku.paloma_grapefruit].filter((v) => v != null)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }
  return null
}

function latasForItem(codigo: string, quantidade: number): number {
  const isPackOf6 = codigo.endsWith('006') || /GUA-.*06$/.test(codigo)
  return quantidade * (isPackOf6 ? 6 : 12)
}

export function useChannelMargins(month: string = currentMonthKey()) {
  return useQuery({
    queryKey: ['channel-margins', month],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ChannelMarginsData> => {
      const earliest = `${month}-01`
      const latest = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0)
        .toISOString().slice(0, 10)

      const [nfsRes, costsRes, cmvRes, settingsRes] = await Promise.all([
        supabase.from('bling_nfs').select('canal, valor, items, status')
          .eq('tipo', 'saida').not('canal', 'is', null)
          .not('canal', 'in', '("industrializacao")')
          .gte('data', earliest).lte('data', latest),
        supabase.from('channel_revenue').select('*').gte('week_start', earliest).lte('week_start', latest),
        supabase.from('cmv_components').select('sku, value'),
        supabase.from('app_settings').select('*').eq('key', 'fixed_costs').maybeSingle(),
      ])
      if (nfsRes.error) throw nfsRes.error
      if (costsRes.error) throw costsRes.error
      if (cmvRes.error) throw cmvRes.error
      const fixedCosts = (settingsRes.data?.value as { value?: number })?.value ?? FIXED_COSTS_MONTHLY

      const cmvBySku: Record<string, number> = {}
      ;(cmvRes.data ?? []).forEach((c) => {
        cmvBySku[c.sku] = (cmvBySku[c.sku] ?? 0) + Number(c.value)
      })

      const costsByCanal = new Map<string, ChannelRevenue[]>()
      ;(costsRes.data as ChannelRevenue[] ?? []).forEach((r) => {
        const list = costsByCanal.get(r.canal) ?? []
        list.push(r)
        costsByCanal.set(r.canal, list)
      })

      const canalMap = new Map<string, { revenue: number; cmv: number; unitsSold: number }>()
      for (const nf of nfsRes.data ?? []) {
        if (nf.status === 'cancelada' || !nf.canal) continue
        const agg = canalMap.get(nf.canal) ?? { revenue: 0, cmv: 0, unitsSold: 0 }
        agg.revenue += Number(nf.valor)
        for (const item of (nf.items ?? []) as BlingNFItemRow[]) {
          const codigo = item.codigo ?? ''
          if (!codigo || codigo.startsWith('Z')) continue
          const cmvLata = matchSkuCmv(codigo, cmvBySku)
          if (cmvLata == null) continue
          const latas = latasForItem(codigo, Number(item.quantidade ?? 0))
          agg.cmv += latas * cmvLata
          agg.unitsSold += latas
        }
        canalMap.set(nf.canal, agg)
      }

      const totalRevenue = Array.from(canalMap.values()).reduce((s, a) => s + a.revenue, 0)

      const rows: ChannelMarginRow[] = Array.from(canalMap.entries()).map(([canal, agg]) => {
        const costRows = costsByCanal.get(canal) ?? []
        const freight = costRows.reduce((s, r) => s + Number(r.freight_cost), 0)
        const labor = costRows.reduce((s, r) => s + Number(r.labor_cost), 0)
        const materials = costRows.reduce((s, r) => s + Number(r.materials_cost), 0)
        const other = costRows.reduce((s, r) => s + Number(r.other_cost || 0), 0)
        const netMargin = agg.revenue - agg.cmv - freight - labor - materials - other
        const netMarginPct = agg.revenue === 0 ? 0 : (netMargin / agg.revenue) * 100
        const revenueShare = totalRevenue === 0 ? 0 : agg.revenue / totalRevenue
        const marginPerUnit = agg.unitsSold === 0 ? 0 : netMargin / agg.unitsSold
        const unitsToBreakeven = marginPerUnit > 0 ? (fixedCosts * revenueShare) / marginPerUnit : 0
        return {
          canal: canal as CanaisType,
          revenue: agg.revenue, cmv: agg.cmv, freight, labor, materials, other,
          netMargin, netMarginPct, unitsSold: agg.unitsSold,
          unitsToBreakeven: Math.ceil(unitsToBreakeven),
        }
      }).sort((a, b) => b.revenue - a.revenue)

      const mostProfitable = rows.length
        ? rows.reduce((best, r) => (r.netMarginPct > best.netMarginPct ? r : best), rows[0])
        : null
      const lossChannels = rows.filter((r) => r.netMargin < 0)

      return { rows, mostProfitable, lossChannels, totalRevenue }
    },
  })
}

export function useUpdateChannelCosts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      canal: CanaisType
      weekStart: string
      freight_cost: number
      labor_cost: number
      materials_cost: number
      other_cost: number
    }) => {
      const { data: existing } = await supabase
        .from('channel_revenue')
        .select('*')
        .eq('canal', input.canal)
        .eq('week_start', input.weekStart)
        .maybeSingle()

      const revenue = existing ? Number(existing.revenue) : 0
      const cmv_total = existing ? Number(existing.cmv_total) : 0
      const gross_margin = revenue - cmv_total
      const net_margin = gross_margin - input.freight_cost - input.labor_cost - input.materials_cost - input.other_cost

      const payload = {
        canal: input.canal,
        week_start: input.weekStart,
        revenue,
        units_sold: existing ? existing.units_sold : 0,
        cmv_total,
        gross_margin,
        freight_cost: input.freight_cost,
        labor_cost: input.labor_cost,
        materials_cost: input.materials_cost,
        other_cost: input.other_cost,
        net_margin,
      }

      const { error } = await supabase.from('channel_revenue').upsert(payload, { onConflict: 'week_start,canal' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-margins'] })
      queryClient.invalidateQueries({ queryKey: ['dre'] })
    },
  })
}

export { monthLabel, shiftMonth }
