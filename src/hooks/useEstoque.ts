import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { CMV_BY_SKU } from '../constants/business'
import type { CMVComponent, InventoryMovement, InventoryMovementType, SKUType } from '../types'

export const SKUS: SKUType[] = ['mango_sour', 'margarita_lime', 'paloma_grapefruit']

// ============================================================
// INVENTÁRIO — resumo por SKU
// ============================================================
export interface SKUInventorySummary {
  sku: SKUType
  currentStock: number
  reorderPoint: number
  cmv: number
  lastUpdated: string | null
}

export interface InventoryData {
  bySku: SKUInventorySummary[]
  totalCans: number
  totalValue: number
  lastBlingSync: string | null
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<InventoryData> => {
      const [movementsRes, settingsRes, cmvRes, blingRes] = await Promise.all([
        supabase.from('inventory_movements').select('*'),
        supabase.from('inventory_settings').select('*'),
        supabase.from('cmv_history').select('*').order('month', { ascending: false }),
        supabase.from('bling_nfs').select('synced_at').order('synced_at', { ascending: false }).limit(1),
      ])
      if (movementsRes.error) throw movementsRes.error
      if (settingsRes.error) throw settingsRes.error
      if (cmvRes.error) throw cmvRes.error

      const movements = (movementsRes.data ?? []) as InventoryMovement[]
      const settings = settingsRes.data ?? []
      const cmvHistory = cmvRes.data ?? []

      const bySku = SKUS.map((sku) => {
        const skuMovements = movements.filter((m) => m.sku === sku)
        const currentStock = skuMovements.reduce(
          (s, m) => s + (m.type === 'entrada' ? m.units : -m.units),
          0
        )
        const reorderPoint = settings.find((s) => s.sku === sku)?.reorder_point ?? 200
        const cmv = cmvHistory.find((c) => c.sku === sku)?.cmv_value ?? CMV_BY_SKU[sku] ?? 0
        const lastUpdated = skuMovements.length
          ? skuMovements.reduce((latest, m) => (m.date > latest ? m.date : latest), skuMovements[0].date)
          : null
        return { sku, currentStock, reorderPoint, cmv: Number(cmv), lastUpdated }
      })

      const totalCans = bySku.reduce((s, b) => s + b.currentStock, 0)
      const totalValue = bySku.reduce((s, b) => s + b.currentStock * b.cmv, 0)
      const lastBlingSync = blingRes.data?.[0]?.synced_at ?? null

      return { bySku, totalCans, totalValue, lastBlingSync }
    },
  })
}

// ============================================================
// MOVIMENTOS — histórico com total acumulado
// ============================================================
export interface MovementFilters {
  sku?: SKUType
  type?: InventoryMovementType
  startDate?: string
  endDate?: string
}

export interface InventoryMovementWithRunning extends InventoryMovement {
  running_total: number
}

export function useInventoryMovements(filters: MovementFilters = {}) {
  return useQuery({
    queryKey: ['inventory-movements', filters],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<InventoryMovementWithRunning[]> => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      const all = (data ?? []) as InventoryMovement[]

      const runningBySku = new Map<string, number>()
      const withRunning: InventoryMovementWithRunning[] = all.map((m) => {
        const prev = runningBySku.get(m.sku) ?? 0
        const next = m.type === 'entrada' ? prev + m.units : prev - m.units
        runningBySku.set(m.sku, next)
        return { ...m, running_total: next }
      })

      let filtered = withRunning
      if (filters.sku) filtered = filtered.filter((m) => m.sku === filters.sku)
      if (filters.type) filtered = filtered.filter((m) => m.type === filters.type)
      if (filters.startDate) filtered = filtered.filter((m) => m.date >= filters.startDate!)
      if (filters.endDate) filtered = filtered.filter((m) => m.date <= filters.endDate!)

      return [...filtered].reverse()
    },
  })
}

// ============================================================
// CRIAR MOVIMENTO
// ============================================================
export interface CreateMovementInput {
  date: string
  sku: SKUType
  type: InventoryMovementType
  units: number
  notes?: string
  bling_nf_id?: string
}

export function useCreateMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateMovementInput) => {
      const { error } = await supabase.from('inventory_movements').insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] })
    },
  })
}

// ============================================================
// PONTOS DE REPOSIÇÃO
// ============================================================
export function useUpdateReorderPoint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sku, reorder_point }: { sku: SKUType; reorder_point: number }) => {
      const { error } = await supabase
        .from('inventory_settings')
        .upsert({ sku, reorder_point, updated_at: new Date().toISOString() }, { onConflict: 'sku' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] })
    },
  })
}

// ============================================================
// COMPOSIÇÃO DO CMV
// ============================================================
export function useCMVComponents() {
  return useQuery({
    queryKey: ['cmv-components'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CMVComponent[]> => {
      const { data, error } = await supabase
        .from('cmv_components')
        .select('*')
        .order('sku', { ascending: true })
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as CMVComponent[]
    },
  })
}

export function useUpdateCMVComponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from('cmv_components')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmv-components'] })
    },
  })
}

// ============================================================
// SUGESTÕES DE REPOSIÇÃO (alertas)
// ============================================================
export interface ReorderSuggestion {
  sku: SKUType
  currentStock: number
  reorderPoint: number
  cmv: number
  avgDailyConsumption: number
  suggestedUnits: number
  estimatedCost: number
  status: 'below' | 'approaching' | 'ok'
}

const REORDER_BUFFER_DAYS = 60

export function useReorderSuggestions() {
  const { data: inventory } = useInventory()
  const { data: movements } = useInventoryMovements()

  return useQuery({
    queryKey: ['reorder-suggestions', inventory?.bySku.length, movements?.length],
    enabled: !!inventory && !!movements,
    queryFn: async (): Promise<ReorderSuggestion[]> => {
      const now = new Date()
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const cutoffStr = cutoff.toISOString().slice(0, 10)

      return (inventory?.bySku ?? []).map((s) => {
        const last30Saida = (movements ?? []).filter(
          (m) => m.sku === s.sku && m.type === 'saida' && m.date >= cutoffStr
        )
        const totalSaida = last30Saida.reduce((sum, m) => sum + m.units, 0)
        const avgDailyConsumption = totalSaida / 30
        const suggestedUnits = Math.ceil(avgDailyConsumption * REORDER_BUFFER_DAYS)
        const estimatedCost = suggestedUnits * s.cmv

        let status: ReorderSuggestion['status'] = 'ok'
        if (s.currentStock < s.reorderPoint) status = 'below'
        else if (s.currentStock < s.reorderPoint * 2) status = 'approaching'

        return {
          sku: s.sku,
          currentStock: s.currentStock,
          reorderPoint: s.reorderPoint,
          cmv: s.cmv,
          avgDailyConsumption,
          suggestedUnits,
          estimatedCost,
          status,
        }
      })
    },
  })
}
