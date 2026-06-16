// ============================================================
// GUADALUPE OS — TypeScript Types
// ============================================================

export type UserRole = 'admin' | 'comercial' | 'marketing' | 'eventos' | 'financeiro' | 'vendedor'
export type CanaisType = 'evento' | 'on_trade' | 'distribuidor' | 'dtc_site' | 'dtc_ml' | 'dtc_amazon'
export type SKUType = 'mango_sour' | 'margarita_lime' | 'paloma_grapefruit'

export type CRMStage =
  | 'lead_novo' | 'contato_feito' | 'qualificado' | 'proposta_enviada'
  | 'negociacao' | 'primeiro_pedido' | 'ativo' | 'em_risco' | 'inativo' | 'perdido'

export type EventStage =
  | 'prospeccao' | 'qualificado' | 'proposta_enviada' | 'negociacao'
  | 'fechado' | 'pre_producao' | 'em_execucao' | 'finalizado' | 'cancelado'

export type AffiliateStatus =
  | 'mapeada' | 'qualificada' | 'contatada' | 'produto_enviado'
  | 'publicou' | 'parceira' | 'inativa'

export type InsightType = 'alerta' | 'sugestao' | 'critico' | 'informativo'

export interface Profile {
  id: string
  user_id: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  active: boolean
  created_at: string
}

export interface Lead {
  id: string
  name: string
  business_name?: string
  phone?: string
  email?: string
  instagram?: string
  cnpj?: string
  origin: string
  canal?: CanaisType
  stage: CRMStage
  assigned_to?: string
  estimated_monthly_units?: number
  estimated_monthly_revenue?: number
  address?: string
  neighborhood?: string
  city: string
  notes?: string
  last_activity_at: string
  last_order_at?: string
  first_order_at?: string
  tags?: string[]
  lost_reason?: string
  created_at: string
  updated_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id: string
  activity_type: string
  description: string
  outcome?: string
  next_action?: string
  next_action_date?: string
  created_at: string
}

export interface PDV {
  id: string
  lead_id?: string
  business_name: string
  owner_name?: string
  phone?: string
  address: string
  neighborhood?: string
  city: string
  cnpj?: string
  canal: CanaisType
  monthly_avg_units: number
  last_order_date?: string
  status: 'ativo' | 'em_risco' | 'inativo'
  notes?: string
  created_at: string
}

export interface PDVOrder {
  id: string
  pdv_id: string
  date: string
  items: { sku: SKUType; units: number; unit_price: number }[]
  total: number
  created_at: string
}

export interface Event {
  id: string
  name: string
  venue?: string
  address?: string
  city: string
  event_date?: string
  event_type?: string
  contact_name?: string
  contact_phone?: string
  stage: EventStage
  assigned_to?: string
  estimated_attendees?: number
  estimated_units_sold?: number
  estimated_revenue?: number
  actual_units_sold?: number
  actual_revenue?: number
  cost_labor: number
  cost_materials: number
  cost_freight: number
  cost_rent: number
  cost_other: number
  total_cost: number
  net_margin?: number
  ugc_count: number
  instagram_tags: number
  videos_count: number
  checklist: { label: string; done: boolean }[]
  nf_numbers: string[]
  stage_history: { stage: EventStage; changed_at: string }[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface EventSale {
  id: string
  event_id: string
  sku: SKUType
  units: number
  unit_price: number
  payment_method?: string
  created_at: string
}

export interface CashFlowEntry {
  id: string
  date: string
  opening_balance: number
  inflows: number
  outflows: number
  closing_balance: number
  notes?: string
  created_at: string
}

export interface ChannelRevenue {
  id: string
  week_start: string
  canal: CanaisType
  revenue: number
  units_sold: number
  cmv_total: number
  gross_margin: number
  freight_cost: number
  labor_cost: number
  materials_cost: number
  other_cost: number
  net_margin: number
}

export type CashEntryType = 'entrada' | 'saida'
export type CashEntryCategory = 'vendas' | 'custos' | 'fixos' | 'outros'

export interface CashEntry {
  id: string
  date: string
  type: CashEntryType
  category: CashEntryCategory
  value: number
  description?: string
  created_at: string
}

export interface CMVHistoryEntry {
  id: string
  sku: SKUType
  month: string
  cmv_value: number
  previous_value?: number
  reason?: string
  bling_nf_ref?: string
  created_at: string
}

export interface BlingNF {
  id: string
  nf_number: string
  cliente: string
  cnpj?: string
  valor: number
  canal?: CanaisType
  data: string
  status: string
  raw_data?: Record<string, unknown>
  synced_at: string
}

export interface AppSetting {
  key: string
  value: { value: number } | Record<string, unknown>
  updated_at: string
}

export interface AgentInsight {
  id: string
  agent_name: string
  insight_type: InsightType
  title: string
  message: string
  action_label?: string
  action_url?: string
  lead_id?: string
  read_by?: string[]
  created_at: string
}

export type InventoryMovementType = 'entrada' | 'saida'

export interface InventoryMovement {
  id: string
  date: string
  sku: SKUType
  type: InventoryMovementType
  units: number
  notes?: string
  bling_nf_id?: string
  created_at: string
}

export interface InventorySetting {
  sku: SKUType
  reorder_point: number
  updated_at: string
}

export interface CMVComponent {
  id: string
  sku: SKUType
  label: string
  value: number
  sort_order: number
  updated_at: string
}

export type AffiliateNiche = 'moda' | 'lifestyle' | 'gastronomia' | 'esportes' | 'viagem' | 'outro'
export type AffiliateContentType = 'post' | 'reel' | 'story'
export type CouponStatus = 'ativo' | 'inativo'
export type DiscoverySource = 'manual' | 'agent'
export type DiscoveryStatus = 'sugerida' | 'analisada' | 'descartada' | 'adicionada'

export interface Affiliate {
  id: string
  name: string
  instagram_handle?: string
  instagram_followers?: number
  engagement_rate?: number
  niche?: string[]
  city?: string
  contact?: string
  status: AffiliateStatus
  investment: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface AffiliateStageHistory {
  id: string
  affiliate_id: string
  stage: AffiliateStatus
  changed_at: string
}

export interface AffiliateProductSent {
  id: string
  affiliate_id: string
  sku: SKUType
  sent_date: string
  cost: number
  created_at: string
}

export interface AffiliateCoupon {
  id: string
  affiliate_id: string
  code: string
  discount_pct: number
  uses: number
  units_generated: number
  revenue_generated: number
  status: CouponStatus
  synced_at?: string
  created_at: string
}

export interface AffiliateContent {
  id: string
  affiliate_id: string
  date: string
  type: AffiliateContentType
  url?: string
  estimated_reach?: number
  notes?: string
  created_at: string
}

export interface AffiliateDiscovery {
  id: string
  name: string
  instagram_handle?: string
  followers?: number
  engagement_rate?: number
  niche?: string[]
  city?: string
  source: DiscoverySource
  fit_score?: number
  fit_breakdown?: Record<string, number | string>
  status: DiscoveryStatus
  notes?: string
  created_at: string
}

// ============================================================
// MARKETING
// ============================================================
export type IGSource = 'manual' | 'api'
export type IGPostType = 'post' | 'reel' | 'story'

export interface IGMetric {
  id: string
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
  source: IGSource
  created_at: string
}

export interface IGPost {
  id: string
  date: string
  type: IGPostType
  title?: string
  likes: number
  comments: number
  saves: number
  reach: number
  impressions: number
  engagement_rate: number
  created_at: string
}

export interface IGCompetitor {
  id: string
  account: string
  followers: number
  posts_per_week: number
  engagement_rate: number
  week_start: string
  created_at: string
}

export interface MarketingGoal {
  id: string
  month: string
  metric_key: string
  metric_label: string
  target_value: number
  actual_value: number
  notes?: string
  created_at: string
}

export interface SEOKeyword {
  id: string
  keyword: string
  tracked: boolean
  created_at: string
}

export interface SEOMetric {
  id: string
  keyword_id: string
  month: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  created_at: string
}

export type EmailCampaignStatus = 'rascunho' | 'agendada' | 'enviada'
export type EmailTriggerType = 'manual' | 'pos_compra' | 'reativacao' | 'boas_vindas'
export type EmailSegment = 'todos' | 'eventos' | 'inativos'

export interface EmailCampaign {
  id: string
  name: string
  status: EmailCampaignStatus
  trigger_type: EmailTriggerType
  subject?: string
  body?: string
  segment: EmailSegment
  sent_count: number
  open_rate?: number
  click_rate?: number
  scheduled_at?: string
  sent_at?: string
  created_at: string
}

export interface EmailAutomation {
  id: string
  name: string
  trigger_type: EmailTriggerType
  status: 'ativo' | 'pausado'
  sent_count: number
  open_rate?: number
  click_rate?: number
  created_at: string
}

export interface EmailSubscriberStats {
  id: string
  month: string
  total_subscribers: number
  new_subscribers: number
  unsubscribes: number
  created_at: string
}

export type AdBudgetTier = 'core' | 'growing' | 'test'
export type AdCampaignStatus = 'ativa' | 'pausada' | 'encerrada' | 'em_analise'

export interface AdCampaign {
  id: string
  platform: string
  name: string
  canal?: CanaisType
  budget_tier: AdBudgetTier
  monthly_budget?: number
  spent_to_date: number
  impressions: number
  clicks: number
  conversions: number
  roas?: number
  cac?: number
  status: AdCampaignStatus
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

export interface AdDailyPerformance {
  id: string
  campaign_id: string
  date: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  created_at: string
}

export interface AdCampaignToPause {
  campaign: string
  reason: string
}

export interface AdBudgetSuggestion {
  from: AdBudgetTier
  to: AdBudgetTier
  amount: number
  reason: string
}

export interface AdAgentReview {
  id: string
  week_start: string
  health_score: number
  campaigns_to_pause: AdCampaignToPause[]
  budget_suggestions: AdBudgetSuggestion[]
  creative_patterns: string[]
  summary?: string
  created_at: string
}
