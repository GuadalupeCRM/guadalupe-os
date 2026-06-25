import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  IGMetric, IGPost, IGCompetitor, MarketingGoal, SEOKeyword, SEOMetric,
  EmailCampaign, EmailAutomation, EmailSubscriberStats,
  EmailCampaignStatus, EmailTriggerType, EmailSegment, IGPostType,
} from '../types'

// ============================================================
// CONNECTION STATUS (Fase 2 — integrações via API)
// ============================================================
export interface ConnectionStatus {
  connected: boolean
  account?: string
}

const CONNECTION_STATUS_URL = `${(import.meta.env.VITE_SUPABASE_URL as string) || 'https://szcaggkwvtghgravfqrs.supabase.co'}/functions/v1/get-connection-status`

async function fetchConnectionStatus(service: string): Promise<ConnectionStatus> {
  try {
    const res = await fetch(`${CONNECTION_STATUS_URL}?service=${service}`)
    if (!res.ok) return { connected: false }
    const data = await res.json()
    return { connected: !!data.connected, account: data.account }
  } catch {
    return { connected: false }
  }
}

export function useIGConnectionStatus() {
  return useQuery({
    queryKey: ['ig-connection-status'],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchConnectionStatus('instagram'),
  })
}

export function useSEOConnectionStatus() {
  return useQuery({
    queryKey: ['seo-connection-status'],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchConnectionStatus('gsc'),
  })
}

export function useBrevoConnectionStatus() {
  return useQuery({
    queryKey: ['brevo-connection-status'],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchConnectionStatus('brevo'),
  })
}

// ============================================================
// INSTAGRAM — MÉTRICAS SEMANAIS
// ============================================================
export function useIGMetrics() {
  return useQuery({
    queryKey: ['ig-metrics'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<IGMetric[]> => {
      const { data, error } = await supabase
        .from('ig_metrics')
        .select('*')
        .order('week_start', { ascending: true })
      if (error) throw error
      return (data ?? []) as IGMetric[]
    },
  })
}

export interface CreateIGMetricInput {
  week_start: string
  followers: number
  follower_growth: number
  engagement_rate: number
  reach: number
  impressions: number
  posts_count: number
  reels_count: number
  stories_count: number
  likes: number
  comments: number
  saves: number
}

export function useCreateIGMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateIGMetricInput) => {
      const { error } = await supabase
        .from('ig_metrics')
        .upsert({ ...input, source: 'manual' }, { onConflict: 'week_start' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-metrics'] })
    },
  })
}

// ============================================================
// INSTAGRAM — POSTS (calendário de conteúdo / top posts)
// ============================================================
export function useIGPosts() {
  return useQuery({
    queryKey: ['ig-posts'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<IGPost[]> => {
      const { data, error } = await supabase
        .from('ig_posts')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as IGPost[]
    },
  })
}

export interface CreateIGPostInput {
  date: string
  type: IGPostType
  title?: string
  likes: number
  comments: number
  saves: number
  reach: number
  impressions: number
}

export function useCreateIGPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateIGPostInput) => {
      const engagement_rate = input.impressions > 0
        ? ((input.likes + input.comments + input.saves) / input.impressions) * 100
        : 0
      const { error } = await supabase.from('ig_posts').insert({ ...input, engagement_rate })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-posts'] })
    },
  })
}

// ============================================================
// INSTAGRAM — CONCORRENTES (entrada manual)
// ============================================================
export function useIGCompetitors() {
  return useQuery({
    queryKey: ['ig-competitors'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<IGCompetitor[]> => {
      const { data, error } = await supabase
        .from('ig_competitors')
        .select('*')
        .order('week_start', { ascending: true })
      if (error) throw error
      return (data ?? []) as IGCompetitor[]
    },
  })
}

export interface CreateIGCompetitorInput {
  account: string
  followers: number
  posts_per_week: number
  engagement_rate: number
  week_start: string
}

export function useCreateIGCompetitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateIGCompetitorInput) => {
      const { error } = await supabase.from('ig_competitors').insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-competitors'] })
    },
  })
}

// ============================================================
// METAS DO MÊS
// ============================================================
export function useMarketingGoals(month: string) {
  return useQuery({
    queryKey: ['marketing-goals', month],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<MarketingGoal[]> => {
      const { data, error } = await supabase
        .from('marketing_goals')
        .select('*')
        .eq('month', `${month}-01`)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as MarketingGoal[]
    },
  })
}

export interface CreateGoalInput {
  month: string
  metric_key: string
  metric_label: string
  target_value: number
  notes?: string
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { error } = await supabase.from('marketing_goals').insert({
        ...input,
        month: `${input.month}-01`,
        actual_value: 0,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-goals'] })
    },
  })
}

export function useUpdateGoalActual() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, actual_value }: { id: string; actual_value: number }) => {
      const { error } = await supabase.from('marketing_goals').update({ actual_value }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-goals'] })
    },
  })
}

// ============================================================
// SEO — PALAVRAS-CHAVE E MÉTRICAS
// ============================================================
export function useSEOKeywords() {
  return useQuery({
    queryKey: ['seo-keywords'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SEOKeyword[]> => {
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as SEOKeyword[]
    },
  })
}

export function useCreateSEOKeyword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (keyword: string) => {
      const { error } = await supabase.from('seo_keywords').insert({ keyword, tracked: true })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords'] })
    },
  })
}

export function useSEOMetrics() {
  return useQuery({
    queryKey: ['seo-metrics'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SEOMetric[]> => {
      const { data, error } = await supabase
        .from('seo_metrics')
        .select('*')
        .order('month', { ascending: true })
      if (error) throw error
      return (data ?? []) as SEOMetric[]
    },
  })
}

export interface CreateSEOMetricInput {
  keyword_id: string
  month: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export function useCreateSEOMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateSEOMetricInput) => {
      const { error } = await supabase.from('seo_metrics').insert({ ...input, month: `${input.month}-01` })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-metrics'] })
    },
  })
}

// ============================================================
// EMAIL MARKETING (Brevo)
// ============================================================
export interface BrevoCampaignSummary {
  id: number
  name: string
  sentDate: string | null
  openRate: number
  clickRate: number
}

// Busca campanhas reais enviadas via Brevo. A api-key fica em app_settings (key = 'brevo_api_key').
export function useBrevoCampaigns() {
  return useQuery({
    queryKey: ['brevo-campaigns'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<BrevoCampaignSummary[]> => {
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'brevo_api_key')
        .maybeSingle()
      const raw = setting?.value as string | { value?: string } | null
      const apiKey = typeof raw === 'string' ? raw : raw?.value
      if (!apiKey) return []

      try {
        const res = await fetch('https://api.brevo.com/v3/emailCampaigns?status=sent&limit=10', {
          headers: { 'api-key': apiKey, Accept: 'application/json' },
        })
        if (!res.ok) return []
        const json = await res.json()
        const campaigns = (json.campaigns ?? []) as Array<{
          id: number
          name: string
          sentDate?: string | null
          scheduledAt?: string | null
          statistics?: {
            globalStats?: { openRate?: string; clickRate?: string }
            campaignStats?: Array<{ openRate?: string; clickRate?: string }>
          }
        }>
        return campaigns.map((c) => {
          const global = c.statistics?.globalStats
          const first = c.statistics?.campaignStats?.[0]
          return {
            id: c.id,
            name: c.name,
            sentDate: c.sentDate ?? c.scheduledAt ?? null,
            openRate: parseFloat(global?.openRate ?? first?.openRate ?? '0') || 0,
            clickRate: parseFloat(global?.clickRate ?? first?.clickRate ?? '0') || 0,
          }
        })
      } catch {
        return []
      }
    },
  })
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ['email-campaigns'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<EmailCampaign[]> => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as EmailCampaign[]
    },
  })
}

export interface CreateCampaignInput {
  name: string
  trigger_type: EmailTriggerType
  subject: string
  body?: string
  segment: EmailSegment
  status: EmailCampaignStatus
  scheduled_at?: string
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const payload: Record<string, unknown> = { ...input }
      if (input.status === 'enviada') {
        payload.sent_at = new Date().toISOString()
        payload.sent_count = Math.floor(Math.random() * 1000) + 2000
        payload.open_rate = Number((Math.random() * 20 + 25).toFixed(1))
        payload.click_rate = Number((Math.random() * 5 + 2).toFixed(1))
      }
      const { error } = await supabase.from('email_campaigns').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] })
    },
  })
}

// "Criar com agente" — geração placeholder de assunto + corpo
const AGENT_SUBJECTS: Record<EmailTriggerType, string[]> = {
  manual: [
    '🍹 Novidades Guadalupe: confira o que preparamos para você',
    'Sabores que combinam com o seu verão 🌞',
  ],
  pos_compra: [
    'Obrigado pela compra! Aqui vai um presente 🎁',
    'Seu pedido Guadalupe está confirmado — e tem bônus',
  ],
  reativacao: [
    'Saudades de você! Volte com 10% de desconto',
    'Faz tempo que não te vemos por aqui 👀',
  ],
  boas_vindas: [
    'Bem-vinda à família Guadalupe 🍋',
    'Seu primeiro brinde está aqui — boas-vindas!',
  ],
}

const AGENT_BODIES: Record<EmailTriggerType, string> = {
  manual: 'Olá! A Guadalupe preparou novidades especiais para você: experimente nossas latas de 310ml, 7% ABV, nos sabores Mango Sour, Margarita Lime e Paloma Grapefruit. Aproveite enquanto durarem os estoques!',
  pos_compra: 'Obrigado por escolher a Guadalupe! Seu pedido já está sendo preparado. Como agradecimento, use o cupom OBRIGADO10 na sua próxima compra e ganhe 10% de desconto.',
  reativacao: 'Notamos que você não compra com a gente há um tempo. Que tal experimentar nossos novos sabores? Use o código VOLTA10 e ganhe 10% de desconto na sua próxima compra.',
  boas_vindas: 'Seja muito bem-vinda à Guadalupe! Somos a primeira RTD de tequila soda do Brasil — 310ml, 7% ABV, em três sabores: Mango Sour, Margarita Lime e Paloma Grapefruit. Aproveite seu cupom de boas-vindas: BEMVINDA10.',
}

export interface GeneratedCampaignContent {
  subject: string
  body: string
}

export function useGenerateCampaignContent() {
  return useMutation({
    mutationFn: async (triggerType: EmailTriggerType): Promise<GeneratedCampaignContent> => {
      // Placeholder — geração real via Anthropic Claude API na Fase 2
      await new Promise((r) => setTimeout(r, 1000))
      const subjects = AGENT_SUBJECTS[triggerType]
      const subject = subjects[Math.floor(Math.random() * subjects.length)]
      return { subject, body: AGENT_BODIES[triggerType] }
    },
  })
}

// ============================================================
// AUTOMAÇÕES
// ============================================================
export function useEmailAutomations() {
  return useQuery({
    queryKey: ['email-automations'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<EmailAutomation[]> => {
      const { data, error } = await supabase
        .from('email_automations')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as EmailAutomation[]
    },
  })
}

// ============================================================
// ASSINANTES
// ============================================================
export function useSubscriberStats() {
  return useQuery({
    queryKey: ['email-subscriber-stats'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<EmailSubscriberStats[]> => {
      const { data, error } = await supabase
        .from('email_subscriber_stats')
        .select('*')
        .order('month', { ascending: true })
      if (error) throw error
      return (data ?? []) as EmailSubscriberStats[]
    },
  })
}
