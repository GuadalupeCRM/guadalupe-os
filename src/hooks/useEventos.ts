import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { CMV_BY_SKU, CMV_AVERAGE } from '../constants/business'
import { DEFAULT_CHECKLIST } from '../pages/eventos/constants'
import type { Event, EventSale, EventStage, SKUType } from '../types'

// ============================================================
// EVENTOS — lista com filtros + realtime
// ============================================================
export interface EventFilters {
  search?: string
  stage?: string
  assigned_to?: string
  event_type?: string
}

export function useEvents(filters: EventFilters = {}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        queryClient.invalidateQueries({ queryKey: ['events'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({
    queryKey: ['events', filters],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Event[]> => {
      let query = supabase.from('events').select('*')

      if (filters.stage) query = query.eq('stage', filters.stage)
      if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
      if (filters.event_type) query = query.eq('event_type', filters.event_type)
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,venue.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.order('event_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as Event[]
    },
  })
}

// ============================================================
// EVENTO ÚNICO + vendas
// ============================================================
export function useEvent(id: string | null) {
  return useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: async (): Promise<Event> => {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
      if (error) throw error
      return data as Event
    },
  })
}

export function useEventSales(eventId: string | null) {
  return useQuery({
    queryKey: ['event-sales', eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventSale[]> => {
      const { data, error } = await supabase
        .from('event_sales')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as EventSale[]
    },
  })
}

// ============================================================
// CRIAR EVENTO
// ============================================================
export interface CreateEventInput {
  name: string
  venue?: string
  address?: string
  city: string
  event_date?: string
  event_type?: string
  contact_name?: string
  contact_phone?: string
  assigned_to?: string
  estimated_attendees?: number
  estimated_units_sold?: number
  estimated_revenue?: number
  notes?: string
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { error } = await supabase.from('events').insert({
        ...input,
        stage: 'prospeccao' as EventStage,
        checklist: DEFAULT_CHECKLIST,
        nf_numbers: [],
        stage_history: [{ stage: 'prospeccao', changed_at: new Date().toISOString() }],
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

// ============================================================
// ATUALIZAR EVENTO (com optimistic update + histórico de estágio)
// ============================================================
export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<Event> & { id: string }) => {
      const payload: Record<string, unknown> = { ...changes }

      if (changes.stage) {
        const { data: current, error: fetchError } = await supabase
          .from('events')
          .select('stage_history')
          .eq('id', id)
          .single()
        if (fetchError) throw fetchError
        const history = (current?.stage_history ?? []) as { stage: EventStage; changed_at: string }[]
        payload.stage_history = [...history, { stage: changes.stage, changed_at: new Date().toISOString() }]
      }

      const { error } = await supabase.from('events').update(payload).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...changes }) => {
      await queryClient.cancelQueries({ queryKey: ['events'] })
      const previous = queryClient.getQueriesData<Event[]>({ queryKey: ['events'] })
      previous.forEach(([key, data]) => {
        if (!data) return
        queryClient.setQueryData<Event[]>(key, data.map((e) => (e.id === id ? { ...e, ...changes } : e)))
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', vars.id] })
    },
  })
}

// ============================================================
// VENDAS DURANTE O EVENTO
// ============================================================
export interface CreateEventSaleInput {
  event_id: string
  sku: SKUType
  units: number
  unit_price: number
  payment_method?: string
}

export function useCreateEventSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEventSaleInput) => {
      const { error } = await supabase.from('event_sales').insert(input)
      if (error) throw error

      const { data: sales, error: salesError } = await supabase
        .from('event_sales')
        .select('units, unit_price')
        .eq('event_id', input.event_id)
      if (salesError) throw salesError

      const actual_units_sold = (sales ?? []).reduce((s, r) => s + r.units, 0)
      const actual_revenue = (sales ?? []).reduce((s, r) => s + r.units * Number(r.unit_price), 0)

      const { error: updateError } = await supabase
        .from('events')
        .update({ actual_units_sold, actual_revenue })
        .eq('id', input.event_id)
      if (updateError) throw updateError
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', vars.event_id] })
      queryClient.invalidateQueries({ queryKey: ['event-sales', vars.event_id] })
    },
  })
}

// ============================================================
// ANÁLISE
// ============================================================
export interface EventsAnalysisData {
  revenuePerType: { type: string; revenue: number }[]
  avgMarginPerType: { type: string; avgMargin: number }[]
  eventsPerMonth: { month: string; count: number }[]
  ugcsPerMonth: { month: string; count: number }[]
  bestPerformingEvents: Event[]
}

export function useEventsAnalysis() {
  const { data: events } = useEvents()

  return useQuery({
    queryKey: ['events-analysis', events?.length],
    enabled: !!events,
    queryFn: async (): Promise<EventsAnalysisData> => {
      const all = events ?? []

      // Receita por tipo de evento
      const types = Array.from(new Set(all.map((e) => e.event_type).filter(Boolean))) as string[]
      const revenuePerType = types.map((type) => ({
        type,
        revenue: all.filter((e) => e.event_type === type).reduce((s, e) => s + (e.actual_revenue ?? e.estimated_revenue ?? 0), 0),
      }))

      // Margem média por tipo
      const avgMarginPerType = types.map((type) => {
        const withMargin = all.filter((e) => e.event_type === type && e.net_margin !== undefined && e.net_margin !== null)
        const avgMargin = withMargin.length
          ? withMargin.reduce((s, e) => s + Number(e.net_margin), 0) / withMargin.length
          : 0
        return { type, avgMargin }
      })

      // Eventos por mês (últimos 6 meses)
      const now = new Date()
      const months: { key: string; label: string }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) })
      }
      const eventsPerMonth = months.map(({ key, label }) => {
        const [y, m] = key.split('-').map(Number)
        const count = all.filter((e) => {
          if (!e.event_date) return false
          const d = new Date(e.event_date)
          return d.getFullYear() === y && d.getMonth() === m
        }).length
        return { month: label, count }
      })

      // UGCs por mês
      const ugcsPerMonth = months.map(({ key, label }) => {
        const [y, m] = key.split('-').map(Number)
        const count = all.filter((e) => {
          if (!e.event_date) return false
          const d = new Date(e.event_date)
          return d.getFullYear() === y && d.getMonth() === m
        }).reduce((s, e) => s + (e.ugc_count ?? 0), 0)
        return { month: label, count }
      })

      // Melhores eventos por margem
      const bestPerformingEvents = [...all]
        .filter((e) => e.net_margin !== undefined && e.net_margin !== null)
        .sort((a, b) => Number(b.net_margin) - Number(a.net_margin))
        .slice(0, 5)

      return { revenuePerType, avgMarginPerType, eventsPerMonth, ugcsPerMonth, bestPerformingEvents }
    },
  })
}

export { CMV_BY_SKU, CMV_AVERAGE }
