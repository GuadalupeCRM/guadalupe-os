import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ADS_ROAS_TARGET, TIER_ORDER, TIER_PCT } from '../pages/ads/constants'
import type { AdAgentReview, AdBudgetTier, AdCampaign, AdCampaignStatus, AdDailyPerformance } from '../types'

// ============================================================
// BUDGET SETTINGS (app_settings)
// ============================================================
export interface AdsBudgetSettings {
  total: number
  tiers: Record<AdBudgetTier, number>
  autopause: boolean
}

export function useAdsBudgetSettings() {
  return useQuery({
    queryKey: ['ads-budget-settings'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<AdsBudgetSettings> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['ads_budget_total', 'ads_budget_tiers', 'ads_agent_autopause'])
      if (error) throw error

      const rows = data ?? []
      const totalRow = rows.find((r) => r.key === 'ads_budget_total')
      const tiersRow = rows.find((r) => r.key === 'ads_budget_tiers')
      const autopauseRow = rows.find((r) => r.key === 'ads_agent_autopause')

      const total = (totalRow?.value as { value?: number })?.value ?? 15000
      const tiersValue = (tiersRow?.value as Record<string, number>) ?? TIER_PCT
      const tiers = {
        core: tiersValue.core ?? TIER_PCT.core,
        growing: tiersValue.growing ?? TIER_PCT.growing,
        test: tiersValue.test ?? TIER_PCT.test,
      }
      const autopause = (autopauseRow?.value as { value?: boolean })?.value ?? false

      return { total, tiers, autopause }
    },
  })
}

export function useSetAdsBudgetTotal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (total: number) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'ads_budget_total', value: { value: total }, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ads-budget-settings'] }),
  })
}

export function useSetAdsBudgetTiers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tiers: Record<AdBudgetTier, number>) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'ads_budget_tiers', value: tiers, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ads-budget-settings'] }),
  })
}

export function useSetAdsAgentAutopause() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (autopause: boolean) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'ads_agent_autopause', value: { value: autopause }, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ads-budget-settings'] }),
  })
}

// ============================================================
// CAMPAIGNS
// ============================================================
export function useAdCampaigns() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('ad-campaigns-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_campaigns' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({
    queryKey: ['ad-campaigns'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AdCampaign[]> => {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .order('monthly_budget', { ascending: false })
      if (error) throw error
      return (data ?? []) as AdCampaign[]
    },
  })
}

export interface NewCampaignInput {
  name: string
  platform: string
  budget_tier: AdBudgetTier
  canal?: string
  monthly_budget: number
  start_date?: string
  end_date?: string
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewCampaignInput) => {
      const { error } = await supabase.from('ad_campaigns').insert({
        ...input,
        spent_to_date: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        status: 'em_analise',
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] }),
  })
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AdCampaignStatus }) => {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] }),
  })
}

// ============================================================
// META ADS CONNECTION (placeholder — Phase 2 integration)
// ============================================================
export function useMetaConnectionStatus() {
  return useQuery({
    queryKey: ['meta-ads-connection'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ connected: boolean }> => {
      return { connected: false }
    },
  })
}

export function useSyncMetaCampaigns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 800))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] }),
  })
}

// ============================================================
// DAILY PERFORMANCE
// ============================================================
export function useAdDailyPerformance(campaignId?: string) {
  return useQuery({
    queryKey: ['ad-daily-performance', campaignId ?? 'all'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<AdDailyPerformance[]> => {
      let query = supabase.from('ad_daily_performance').select('*').order('date', { ascending: true })
      if (campaignId) query = query.eq('campaign_id', campaignId)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as AdDailyPerformance[]
    },
  })
}

// ============================================================
// PERFORMANCE SUMMARY
// ============================================================
export interface PerformanceSummary {
  totalSpent: number
  totalImpressions: number
  totalClicks: number
  avgCtr: number
  avgRoas: number
  avgCac: number
  roasByCampaign: { name: string; roas: number }[]
  cacByChannel: { channel: string; cac: number }[]
  dailySpend: { date: string; spend: number }[]
  best: AdCampaign | null
  worst: AdCampaign | null
}

export function useAdsPerformanceSummary() {
  const { data: campaigns, isLoading: loadingCampaigns } = useAdCampaigns()
  const { data: daily, isLoading: loadingDaily } = useAdDailyPerformance()

  const isLoading = loadingCampaigns || loadingDaily

  const summary: PerformanceSummary | null = (() => {
    if (!campaigns) return null
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent_to_date, 0)
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0)
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0)
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    const withRoas = campaigns.filter((c) => c.roas !== undefined && c.roas !== null)
    const avgRoas = withRoas.length ? withRoas.reduce((sum, c) => sum + (c.roas ?? 0), 0) / withRoas.length : 0

    const withCac = campaigns.filter((c) => c.cac !== undefined && c.cac !== null)
    const avgCac = withCac.length ? withCac.reduce((sum, c) => sum + (c.cac ?? 0), 0) / withCac.length : 0

    const roasByCampaign = [...withRoas]
      .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
      .map((c) => ({ name: c.name, roas: c.roas ?? 0 }))

    const channelMap = new Map<string, { sum: number; count: number }>()
    campaigns.filter((c) => c.canal && c.cac !== undefined).forEach((c) => {
      const key = c.canal as string
      const entry = channelMap.get(key) ?? { sum: 0, count: 0 }
      entry.sum += c.cac ?? 0
      entry.count += 1
      channelMap.set(key, entry)
    })
    const cacByChannel = Array.from(channelMap.entries()).map(([channel, { sum, count }]) => ({
      channel,
      cac: sum / count,
    }))

    const dailyMap = new Map<string, number>()
    ;(daily ?? []).forEach((d) => {
      dailyMap.set(d.date, (dailyMap.get(d.date) ?? 0) + Number(d.spend))
    })
    const dailySpend = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, spend]) => ({ date, spend }))

    const ranked = [...withRoas].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
    const best = ranked[0] ?? null
    const worst = ranked.length > 1 ? ranked[ranked.length - 1] : null

    return {
      totalSpent, totalImpressions, totalClicks, avgCtr, avgRoas, avgCac,
      roasByCampaign, cacByChannel, dailySpend, best, worst,
    }
  })()

  return { data: summary, isLoading, roasTarget: ADS_ROAS_TARGET }
}

// ============================================================
// AGENT REVIEWS
// ============================================================
export function useAdAgentReviews() {
  return useQuery({
    queryKey: ['ad-agent-reviews'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<AdAgentReview[]> => {
      const { data, error } = await supabase
        .from('ad_agent_reviews')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(4)
      if (error) throw error
      return (data ?? []) as AdAgentReview[]
    },
  })
}

export function useRequestAdsReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 1500))

      const { data: campaignsData, error: campaignsError } = await supabase.from('ad_campaigns').select('*')
      if (campaignsError) throw campaignsError
      const campaigns = (campaignsData ?? []) as AdCampaign[]

      const campaignsToPause = campaigns
        .filter((c) => c.status === 'ativa' || c.status === 'em_analise')
        .filter((c) => (c.roas ?? 0) < 1.5)
        .map((c) => ({
          campaign: c.name,
          reason: `ROAS de ${(c.roas ?? 0).toFixed(1)}x está abaixo do mínimo aceitável (1.5x).`,
        }))

      const tierTotals = TIER_ORDER.map((tier) => {
        const tierCampaigns = campaigns.filter((c) => c.budget_tier === tier)
        const budget = tierCampaigns.reduce((sum, c) => sum + (c.monthly_budget ?? 0), 0)
        const spent = tierCampaigns.reduce((sum, c) => sum + c.spent_to_date, 0)
        const avgRoas = tierCampaigns.length
          ? tierCampaigns.reduce((sum, c) => sum + (c.roas ?? 0), 0) / tierCampaigns.length
          : 0
        return { tier, budget, spent, pct: budget > 0 ? (spent / budget) * 100 : 0, avgRoas }
      })

      const budgetSuggestions: { from: AdBudgetTier; to: AdBudgetTier; amount: number; reason: string }[] = []
      const bestTier = [...tierTotals].sort((a, b) => b.avgRoas - a.avgRoas)[0]
      const worstTier = [...tierTotals].sort((a, b) => a.avgRoas - b.avgRoas)[0]
      if (bestTier && worstTier && bestTier.tier !== worstTier.tier && worstTier.pct < 70) {
        budgetSuggestions.push({
          from: worstTier.tier,
          to: bestTier.tier,
          amount: Math.round(worstTier.budget * 0.1),
          reason: `${bestTier.tier.toUpperCase()} tem ROAS médio de ${bestTier.avgRoas.toFixed(1)}x — realocar parte do budget de ${worstTier.tier.toUpperCase()} para acelerar resultados.`,
        })
      }

      const avgRoasAll = campaigns.length
        ? campaigns.reduce((sum, c) => sum + (c.roas ?? 0), 0) / campaigns.length
        : 0
      const pauseRatio = campaigns.length ? campaignsToPause.length / campaigns.length : 0
      const healthScore = Math.max(0, Math.min(100, Math.round(
        50 + (avgRoasAll - ADS_ROAS_TARGET) * 10 - pauseRatio * 40
      )))

      const creativePatterns = [
        'Vídeos verticais curtos (até 15s) com cortes rápidos têm CTR acima da média',
        'Criativos com depoimento em vídeo (UGC) convertem melhor no público feminino 25-35',
        'Anúncios destacando "refrescância" e momentos de calor têm melhor performance em SP/RJ',
      ]

      const summary = `Health score atual: ${healthScore}/100. ROAS médio das campanhas ativas: ${avgRoasAll.toFixed(1)}x (meta: ${ADS_ROAS_TARGET}x). ${campaignsToPause.length} campanha(s) recomendada(s) para pausa.`

      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() + 1)
      const weekStartStr = weekStart.toISOString().slice(0, 10)

      const { error } = await supabase.from('ad_agent_reviews').insert({
        week_start: weekStartStr,
        health_score: healthScore,
        campaigns_to_pause: campaignsToPause,
        budget_suggestions: budgetSuggestions,
        creative_patterns: creativePatterns,
        summary,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ad-agent-reviews'] }),
  })
}
