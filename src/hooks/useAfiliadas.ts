import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { generateCouponCode } from '../pages/afiliadas/constants'
import type {
  Affiliate, AffiliateStageHistory, AffiliateProductSent, AffiliateCoupon,
  AffiliateContent, AffiliateDiscovery, AffiliateStatus, SKUType,
} from '../types'

// ============================================================
// AFFILIATES — lista + stats computados
// ============================================================
export interface AffiliateWithStats extends Affiliate {
  coupons: AffiliateCoupon[]
  products: AffiliateProductSent[]
  total_revenue: number
  total_product_cost: number
  total_uses: number
  roi: number
  roi_pct: number | null
}

function computeStats(affiliate: Affiliate, coupons: AffiliateCoupon[], products: AffiliateProductSent[]): AffiliateWithStats {
  const total_revenue = coupons.reduce((sum, c) => sum + c.revenue_generated, 0)
  const total_uses = coupons.reduce((sum, c) => sum + c.uses, 0)
  const total_product_cost = products.reduce((sum, p) => sum + p.cost, 0)
  const roi = total_revenue - total_product_cost - affiliate.investment
  const investedTotal = total_product_cost + affiliate.investment
  const roi_pct = investedTotal > 0 ? (total_revenue / investedTotal) * 100 : null
  return { ...affiliate, coupons, products, total_revenue, total_product_cost, total_uses, roi, roi_pct }
}

export function useAffiliates() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('affiliates-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliates' }, () => {
        queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({
    queryKey: ['affiliates'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AffiliateWithStats[]> => {
      const [affiliatesRes, couponsRes, productsRes] = await Promise.all([
        supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
        supabase.from('affiliate_coupons').select('*'),
        supabase.from('affiliate_products_sent').select('*'),
      ])
      if (affiliatesRes.error) throw affiliatesRes.error
      if (couponsRes.error) throw couponsRes.error
      if (productsRes.error) throw productsRes.error

      const coupons = (couponsRes.data ?? []) as AffiliateCoupon[]
      const products = (productsRes.data ?? []) as AffiliateProductSent[]

      return ((affiliatesRes.data ?? []) as Affiliate[]).map((a) =>
        computeStats(
          a,
          coupons.filter((c) => c.affiliate_id === a.id),
          products.filter((p) => p.affiliate_id === a.id),
        )
      )
    },
  })
}

// ============================================================
// AFFILIATE ÚNICO — com histórico, conteúdo
// ============================================================
export interface AffiliateWithDetails extends AffiliateWithStats {
  stage_history: AffiliateStageHistory[]
  content: AffiliateContent[]
}

export function useAffiliate(id: string | null) {
  return useQuery({
    queryKey: ['affiliate', id],
    enabled: !!id,
    queryFn: async (): Promise<AffiliateWithDetails> => {
      const [affiliateRes, couponsRes, productsRes, historyRes, contentRes] = await Promise.all([
        supabase.from('affiliates').select('*').eq('id', id).single(),
        supabase.from('affiliate_coupons').select('*').eq('affiliate_id', id),
        supabase.from('affiliate_products_sent').select('*').eq('affiliate_id', id),
        supabase.from('affiliate_stage_history').select('*').eq('affiliate_id', id).order('changed_at', { ascending: true }),
        supabase.from('affiliate_content').select('*').eq('affiliate_id', id).order('date', { ascending: false }),
      ])
      if (affiliateRes.error) throw affiliateRes.error
      if (couponsRes.error) throw couponsRes.error
      if (productsRes.error) throw productsRes.error
      if (historyRes.error) throw historyRes.error
      if (contentRes.error) throw contentRes.error

      const stats = computeStats(
        affiliateRes.data as Affiliate,
        (couponsRes.data ?? []) as AffiliateCoupon[],
        (productsRes.data ?? []) as AffiliateProductSent[],
      )

      return {
        ...stats,
        stage_history: (historyRes.data ?? []) as AffiliateStageHistory[],
        content: (contentRes.data ?? []) as AffiliateContent[],
      }
    },
  })
}

// ============================================================
// CRIAR AFFILIATE
// ============================================================
export interface CreateAffiliateInput {
  name: string
  instagram_handle?: string
  instagram_followers?: number
  engagement_rate?: number
  niche?: string[]
  city?: string
  contact?: string
  notes?: string
}

export function useCreateAffiliate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAffiliateInput) => {
      const { data, error } = await supabase.from('affiliates').insert({ ...input, status: 'mapeada' }).select().single()
      if (error) throw error
      const affiliate = data as Affiliate
      const { error: historyError } = await supabase.from('affiliate_stage_history').insert({
        affiliate_id: affiliate.id,
        stage: 'mapeada',
        changed_at: new Date().toISOString(),
      })
      if (historyError) throw historyError
      return affiliate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
    },
  })
}

// ============================================================
// MUDAR ESTÁGIO
// ============================================================
export function useUpdateAffiliateStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: AffiliateStatus }) => {
      const { error } = await supabase.from('affiliates').update({ status: stage, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      const { error: historyError } = await supabase.from('affiliate_stage_history').insert({
        affiliate_id: id,
        stage,
        changed_at: new Date().toISOString(),
      })
      if (historyError) throw historyError
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['affiliate', vars.id] })
    },
  })
}

// ============================================================
// PRODUTO ENVIADO
// ============================================================
export interface AddProductSentInput {
  affiliate_id: string
  sku: SKUType
  sent_date: string
  cost: number
}

export function useAddProductSent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddProductSentInput) => {
      const { error } = await supabase.from('affiliate_products_sent').insert(input)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['affiliate', vars.affiliate_id] })
    },
  })
}

// ============================================================
// CUPONS
// ============================================================
export function useCoupons() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('affiliate-coupons-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_coupons' }, () => {
        queryClient.invalidateQueries({ queryKey: ['affiliate-coupons'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({
    queryKey: ['affiliate-coupons'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AffiliateCoupon[]> => {
      const { data, error } = await supabase.from('affiliate_coupons').select('*').order('revenue_generated', { ascending: false })
      if (error) throw error
      return (data ?? []) as AffiliateCoupon[]
    },
  })
}

export interface CreateCouponInput {
  affiliate_id: string
  affiliate_name: string
  discount_pct: number
}

export function useCreateCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCouponInput) => {
      const { count, error: countError } = await supabase
        .from('affiliate_coupons')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', input.affiliate_id)
      if (countError) throw countError
      const code = generateCouponCode(input.affiliate_name, (count ?? 0) + 1)
      const { error } = await supabase.from('affiliate_coupons').insert({
        affiliate_id: input.affiliate_id,
        code,
        discount_pct: input.discount_pct,
        status: 'ativo',
      })
      if (error) throw error
      return code
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-coupons'] })
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['affiliate', vars.affiliate_id] })
    },
  })
}

// ============================================================
// SHOPIFY SYNC (placeholder — integração fase 2)
// ============================================================
export function useShopifySyncCoupons() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 800))
      const { data, error } = await supabase.from('affiliate_coupons').select('id')
      if (error) throw error
      const now = new Date().toISOString()
      await Promise.all((data ?? []).map((c) => supabase.from('affiliate_coupons').update({ synced_at: now }).eq('id', c.id)))
      return now
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-coupons'] })
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
    },
  })
}

// ============================================================
// CONTEÚDO (posts/reels/stories)
// ============================================================
export interface AddContentInput {
  affiliate_id: string
  date: string
  type: 'post' | 'reel' | 'story'
  url?: string
  estimated_reach?: number
  notes?: string
}

export function useAddContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddContentInput) => {
      const { error } = await supabase.from('affiliate_content').insert(input)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['affiliate', vars.affiliate_id] })
    },
  })
}

// ============================================================
// NOTAS
// ============================================================
export function useUpdateAffiliateNotes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from('affiliates').update({ notes, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['affiliate', vars.id] })
    },
  })
}

// ============================================================
// DESCOBERTA (AI)
// ============================================================
export function useDiscovery() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('affiliate-discovery-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_discovery' }, () => {
        queryClient.invalidateQueries({ queryKey: ['affiliate-discovery'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({
    queryKey: ['affiliate-discovery'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AffiliateDiscovery[]> => {
      const { data, error } = await supabase.from('affiliate_discovery').select('*').order('fit_score', { ascending: false })
      if (error) throw error
      return (data ?? []) as AffiliateDiscovery[]
    },
  })
}

export interface AnalyzeDiscoveryInput {
  name: string
  instagram_handle?: string
  followers?: number
  engagement_rate?: number
  niche?: string[]
  city?: string
  notes?: string
}

// Mock de análise do agente — fase 2: substituir por chamada real à Anthropic API
export function useAnalyzeDiscovery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AnalyzeDiscoveryInput) => {
      await new Promise((r) => setTimeout(r, 1000))

      const [affiliatesRes] = await Promise.all([
        supabase.from('affiliates').select('*').eq('status', 'parceira'),
      ])
      if (affiliatesRes.error) throw affiliatesRes.error
      const partners = (affiliatesRes.data ?? []) as Affiliate[]

      const followers = input.followers ?? 0
      const engagement = input.engagement_rate ?? 0

      const partnerNiches = new Set(partners.flatMap((p) => p.niche ?? []))
      const nicheMatch = (input.niche ?? []).some((n) => partnerNiches.has(n)) ? 90 : 50

      const avgFollowers = partners.length
        ? partners.reduce((sum, p) => sum + (p.instagram_followers ?? 0), 0) / partners.length
        : 30000
      const followerDiffRatio = avgFollowers > 0 ? Math.abs(followers - avgFollowers) / avgFollowers : 1
      const followerRangeMatch = Math.max(0, Math.round(100 - followerDiffRatio * 60))

      const avgEngagement = partners.length
        ? partners.reduce((sum, p) => sum + (p.engagement_rate ?? 0), 0) / partners.length
        : 3.5
      const engagementMatch = Math.max(0, Math.min(100, Math.round((engagement / Math.max(avgEngagement, 0.1)) * 70)))

      const partnerCities = new Set(partners.map((p) => p.city).filter(Boolean))
      const cityMatch = input.city && partnerCities.has(input.city) ? 100 : 60

      const fit_score = Math.round((nicheMatch + followerRangeMatch + engagementMatch + cityMatch) / 4)
      const estimatedCostPerResult = followers > 0 ? `R$ ${(2.5 - (engagement / 10)).toFixed(2)}` : '—'

      const fit_breakdown = {
        niche_match: nicheMatch,
        follower_range_match: followerRangeMatch,
        engagement_vs_average: engagementMatch,
        city_match: cityMatch,
        estimated_cost_per_result: estimatedCostPerResult,
      }

      const { error } = await supabase.from('affiliate_discovery').insert({
        name: input.name,
        instagram_handle: input.instagram_handle,
        followers: input.followers,
        engagement_rate: input.engagement_rate,
        niche: input.niche ?? [],
        city: input.city,
        source: 'manual',
        fit_score,
        fit_breakdown,
        status: 'analisada',
        notes: input.notes,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-discovery'] })
    },
  })
}

export function useUpdateDiscoveryStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AffiliateDiscovery['status'] }) => {
      const { error } = await supabase.from('affiliate_discovery').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-discovery'] })
    },
  })
}

// ============================================================
// PROMOVER DESCOBERTA → AFFILIATE
// ============================================================
export function usePromoteDiscovery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (discovery: AffiliateDiscovery) => {
      const { data, error } = await supabase.from('affiliates').insert({
        name: discovery.name,
        instagram_handle: discovery.instagram_handle,
        instagram_followers: discovery.followers,
        engagement_rate: discovery.engagement_rate,
        niche: discovery.niche ?? [],
        city: discovery.city,
        status: 'mapeada',
      }).select().single()
      if (error) throw error
      const affiliate = data as Affiliate
      const { error: historyError } = await supabase.from('affiliate_stage_history').insert({
        affiliate_id: affiliate.id,
        stage: 'mapeada',
        changed_at: new Date().toISOString(),
      })
      if (historyError) throw historyError
      const { error: updateError } = await supabase.from('affiliate_discovery').update({ status: 'adicionada' }).eq('id', discovery.id)
      if (updateError) throw updateError
      return affiliate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['affiliate-discovery'] })
    },
  })
}
