import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { LEAD_ALERT_HOURS, PAP_CONVERSION_RATE, PDV_RISK_DAYS, BREAKEVEN_MONTHLY, CRM_STAGE_LABELS } from '../constants/business'
import type { Lead, LeadActivity, PDV, PDVOrder, Profile, AgentInsight, CRMStage, CanaisType, SKUType } from '../types'

// ============================================================
// PROFILES (equipe)
// ============================================================
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

// ============================================================
// LEADS — lista com filtros + realtime
// ============================================================
export interface LeadFilters {
  search?: string
  canal?: string
  origin?: string
  assigned_to?: string
  stage?: string
  semAtividade?: boolean
  tag?: string
}

export function useLeads(filters: LeadFilters = {}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['leads'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({
    queryKey: ['leads', filters],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Lead[]> => {
      let query = supabase.from('leads').select('*')

      if (filters.canal) query = query.eq('canal', filters.canal)
      if (filters.origin) query = query.eq('origin', filters.origin)
      if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
      if (filters.stage) query = query.eq('stage', filters.stage)
      if (filters.tag) query = query.contains('tags', [filters.tag])
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,business_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
      }
      if (filters.semAtividade) {
        const cutoff = new Date(Date.now() - LEAD_ALERT_HOURS * 60 * 60 * 1000).toISOString()
        query = query.lt('last_activity_at', cutoff)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Lead[]
    },
  })
}

// ============================================================
// LEAD ÚNICO — com atividades e insights
// ============================================================
export interface LeadWithDetails {
  lead: Lead
  activities: LeadActivity[]
  insights: AgentInsight[]
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: ['lead', id],
    enabled: !!id,
    queryFn: async (): Promise<LeadWithDetails> => {
      const [leadRes, activitiesRes, insightsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
        supabase.from('agent_insights').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      ])
      if (leadRes.error) throw leadRes.error
      if (activitiesRes.error) throw activitiesRes.error
      return {
        lead: leadRes.data as Lead,
        activities: (activitiesRes.data ?? []) as LeadActivity[],
        insights: (insightsRes.data ?? []) as AgentInsight[],
      }
    },
  })
}

// ============================================================
// CRIAR LEAD
// ============================================================
export interface CreateLeadInput {
  name: string
  business_name?: string
  phone?: string
  email?: string
  instagram?: string
  canal: CanaisType
  origin: string
  assigned_to?: string
  estimated_monthly_units?: number
  city: string
  neighborhood?: string
  notes?: string
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      const { error } = await supabase.from('leads').insert({
        ...input,
        stage: 'lead_novo' as CRMStage,
        last_activity_at: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// ============================================================
// ATUALIZAR LEAD (com optimistic update para mudança de estágio)
// ============================================================
export function useUpdateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<Lead> & { id: string }) => {
      const { error } = await supabase.from('leads').update(changes).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...changes }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const previous = queryClient.getQueriesData<Lead[]>({ queryKey: ['leads'] })
      previous.forEach(([key, data]) => {
        if (!data) return
        queryClient.setQueryData<Lead[]>(key, data.map((l) => (l.id === id ? { ...l, ...changes } : l)))
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', vars.id] })
    },
  })
}

// ============================================================
// MARCAR LEAD COMO PERDIDO
// ============================================================
export function useMarkLeadLost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from('leads').update({ stage: 'perdido' as CRMStage, lost_reason: reason }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', vars.id] })
    },
  })
}

// ============================================================
// ATIVIDADES
// ============================================================
export interface CreateActivityInput {
  lead_id: string
  user_id?: string
  activity_type: string
  description: string
  outcome?: string
  next_action?: string
  next_action_date?: string
}

export function useCreateActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const { error } = await supabase.from('lead_activities').insert(input)
      if (error) throw error
      const { error: updateError } = await supabase
        .from('leads')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', input.lead_id)
      if (updateError) throw updateError
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead', vars.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

// ============================================================
// FEED DE ATIVIDADES (Atividades tab)
// ============================================================
export interface ActivityFeedItem extends LeadActivity {
  lead_business_name?: string
  user_full_name?: string
}

export interface ActivityFilters {
  userId?: string
  activityType?: string
  startDate?: string
  endDate?: string
}

export function useActivityFeed(filters: ActivityFilters = {}) {
  return useQuery({
    queryKey: ['activities', filters],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ActivityFeedItem[]> => {
      let query = supabase
        .from('lead_activities')
        .select('*, leads(business_name), profiles(full_name)')

      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.activityType) query = query.eq('activity_type', filters.activityType)
      if (filters.startDate) query = query.gte('created_at', filters.startDate)
      if (filters.endDate) query = query.lte('created_at', filters.endDate)

      const { data, error } = await query.order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      return (data ?? []).map((row: any) => ({
        ...row,
        lead_business_name: row.leads?.business_name,
        user_full_name: row.profiles?.full_name,
      })) as ActivityFeedItem[]
    },
  })
}

// ============================================================
// PDVs
// ============================================================
export interface PDVWithStats extends PDV {
  daysSinceLastOrder: number | null
}

export function usePDVs() {
  return useQuery({
    queryKey: ['pdvs'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<PDVWithStats[]> => {
      const { data, error } = await supabase.from('pdvs').select('*').order('business_name')
      if (error) throw error
      const now = Date.now()
      return (data ?? []).map((p: PDV) => ({
        ...p,
        daysSinceLastOrder: p.last_order_date
          ? Math.floor((now - new Date(p.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }))
    },
  })
}

export function usePDVOrders(pdvId: string | null) {
  return useQuery({
    queryKey: ['pdv-orders', pdvId],
    enabled: !!pdvId,
    queryFn: async (): Promise<PDVOrder[]> => {
      const { data, error } = await supabase
        .from('pdv_orders')
        .select('*')
        .eq('pdv_id', pdvId)
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as PDVOrder[]
    },
  })
}

export interface CreatePDVOrderInput {
  pdv_id: string
  date: string
  items: { sku: SKUType; units: number; unit_price: number }[]
}

export function useCreatePDVOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePDVOrderInput) => {
      const total = input.items.reduce((s, i) => s + i.units * i.unit_price, 0)
      const { error } = await supabase.from('pdv_orders').insert({ ...input, total })
      if (error) throw error
      const { error: updateError } = await supabase
        .from('pdvs')
        .update({ last_order_date: input.date })
        .eq('id', input.pdv_id)
      if (updateError) throw updateError
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] })
      queryClient.invalidateQueries({ queryKey: ['pdv-orders', vars.pdv_id] })
    },
  })
}

// ============================================================
// CONVERTER LEAD EM PDV
// ============================================================
export function useConvertLeadToPDV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lead: Lead) => {
      const { error } = await supabase.from('pdvs').insert({
        lead_id: lead.id,
        business_name: lead.business_name ?? lead.name,
        owner_name: lead.name,
        phone: lead.phone,
        address: lead.address ?? '',
        neighborhood: lead.neighborhood,
        city: lead.city,
        cnpj: lead.cnpj,
        canal: lead.canal ?? 'on_trade',
        monthly_avg_units: lead.estimated_monthly_units ?? 0,
        status: 'ativo',
      })
      if (error) throw error
      const { error: updateError } = await supabase.from('leads').update({ stage: 'ativo' as CRMStage }).eq('id', lead.id)
      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdvs'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// ============================================================
// ANÁLISE
// ============================================================
export interface CRMAnalysisData {
  funnel: { stage: CRMStage; label: string; count: number }[]
  conversionByStage: { from: string; to: string; pct: number }[]
  conversionByCanal: { canal: string; total: number; convertidos: number; pct: number }[]
  conversionByOrigin: { origin: string; total: number; convertidos: number; pct: number }[]
  avgTimeToCloseDays: number | null
  leadsPerWeek: { week: string; count: number }[]
  leadsByAssignee: { name: string; count: number }[]
  leadsNeededForBreakeven: number
}

const FUNNEL_STAGES: CRMStage[] = [
  'lead_novo', 'contato_feito', 'qualificado', 'proposta_enviada', 'negociacao', 'primeiro_pedido',
]

const CONVERTED_STAGES: CRMStage[] = ['primeiro_pedido', 'ativo']

export function useCRMAnalysis() {
  const { data: leads } = useLeads()
  const { data: profiles } = useProfiles()

  return useQuery({
    queryKey: ['crm-analysis', leads?.length, profiles?.length],
    enabled: !!leads && !!profiles,
    queryFn: async (): Promise<CRMAnalysisData> => {
      const all = leads ?? []
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

      // Funil
      const funnel = FUNNEL_STAGES.map((stage) => ({
        stage,
        label: CRM_STAGE_LABELS[stage] ?? stage,
        count: all.filter((l) => l.stage === stage).length,
      }))

      // Conversão estágio a estágio (acumulado regressivo simples)
      const conversionByStage = funnel.slice(0, -1).map((cur, i) => {
        const next = funnel[i + 1]
        const pct = cur.count === 0 ? 0 : (next.count / cur.count) * 100
        return { from: cur.label, to: next.label, pct }
      })

      // Conversão por canal
      const canais = Array.from(new Set(all.map((l) => l.canal).filter(Boolean))) as string[]
      const conversionByCanal = canais.map((canal) => {
        const inCanal = all.filter((l) => l.canal === canal)
        const convertidos = inCanal.filter((l) => CONVERTED_STAGES.includes(l.stage)).length
        return {
          canal,
          total: inCanal.length,
          convertidos,
          pct: inCanal.length === 0 ? 0 : (convertidos / inCanal.length) * 100,
        }
      })

      // Conversão por origem
      const origins = Array.from(new Set(all.map((l) => l.origin).filter(Boolean)))
      const conversionByOrigin = origins.map((origin) => {
        const inOrigin = all.filter((l) => l.origin === origin)
        const convertidos = inOrigin.filter((l) => CONVERTED_STAGES.includes(l.stage)).length
        return {
          origin,
          total: inOrigin.length,
          convertidos,
          pct: inOrigin.length === 0 ? 0 : (convertidos / inOrigin.length) * 100,
        }
      })

      // Tempo médio até fechar
      const closedLeads = all.filter((l) => l.first_order_at)
      const avgTimeToCloseDays = closedLeads.length === 0 ? null : (
        closedLeads.reduce((s, l) => {
          const created = new Date(l.created_at).getTime()
          const closed = new Date(l.first_order_at!).getTime()
          return s + (closed - created) / (1000 * 60 * 60 * 24)
        }, 0) / closedLeads.length
      )

      // Leads adicionados por semana (últimas 8 semanas)
      const now = new Date()
      const leadsPerWeek: { week: string; count: number }[] = []
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - i * 7 - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        const count = all.filter((l) => {
          const created = new Date(l.created_at)
          return created >= weekStart && created < weekEnd
        }).length
        leadsPerWeek.push({
          week: weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          count,
        })
      }

      // Leads por responsável
      const assigneeMap = new Map<string, number>()
      all.forEach((l) => {
        const name = l.assigned_to ? (profileMap.get(l.assigned_to) ?? 'Sem responsável') : 'Sem responsável'
        assigneeMap.set(name, (assigneeMap.get(name) ?? 0) + 1)
      })
      const leadsByAssignee = Array.from(assigneeMap.entries()).map(([name, count]) => ({ name, count }))

      // Leads necessários para breakeven (referência PAP)
      const withRevenue = all.filter((l) => l.estimated_monthly_revenue && l.estimated_monthly_revenue > 0)
      const avgRevenuePerLead = withRevenue.length
        ? withRevenue.reduce((s, l) => s + Number(l.estimated_monthly_revenue), 0) / withRevenue.length
        : BREAKEVEN_MONTHLY / 10
      const customersNeeded = Math.max(BREAKEVEN_MONTHLY / avgRevenuePerLead, 0)
      const leadsNeededForBreakeven = Math.ceil(customersNeeded / PAP_CONVERSION_RATE)

      return {
        funnel,
        conversionByStage,
        conversionByCanal,
        conversionByOrigin,
        avgTimeToCloseDays,
        leadsPerWeek,
        leadsByAssignee,
        leadsNeededForBreakeven,
      }
    },
  })
}

export { PDV_RISK_DAYS }
