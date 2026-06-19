import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ============================================================
// SHOPIFY ORDERS
// ============================================================
export interface ShopifyOrder {
  id: string
  shopify_order_id: string
  customer_name: string | null
  customer_email: string | null
  skus: { sku: string; quantity: number }[]
  total_value: number
  discount_code: string | null
  canal: string
  order_date: string
  created_at: string
}

export function useShopifyOrders(limit = 50) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('shopify-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopify_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['shopify-orders'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({
    queryKey: ['shopify-orders', limit],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ShopifyOrder[]> => {
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('*')
        .order('order_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as ShopifyOrder[]
    },
  })
}

export function useShopifyConnectionStatus() {
  return useQuery({
    queryKey: ['shopify-connection-status'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://szcaggkwvtghgravfqrs.supabase.co'
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-connection-status?service=shopify`)
        if (!res.ok) return { connected: false }
        return res.json()
      } catch {
        return { connected: false }
      }
    },
  })
}

export function useSyncShopify() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Shopify envia dados via webhook (push), não há endpoint de "puxar" agora.
      // O botão apenas força a UI a buscar o estado mais recente do banco.
      await queryClient.invalidateQueries({ queryKey: ['shopify-orders'] })
      return true
    },
  })
}

// ============================================================
// VISÃO GERAL — MRR, retenção, top SKUs, funil
// ============================================================
export interface B2COverview {
  mrr: number
  mrrPrevMonth: number
  mrrDropped: boolean
  retentionRate: number | null
  topSkus: { sku: string; units: number }[]
  aov: number
  ordersThisMonth: number
}

function monthRangeKeys(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function useB2COverview() {
  const { data: orders } = useShopifyOrders(500)

  return useQuery({
    queryKey: ['b2c-overview', orders?.length],
    enabled: !!orders,
    queryFn: async (): Promise<B2COverview> => {
      const all = orders ?? []
      const now = new Date()
      const thisMonth = monthRangeKeys(now)
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonth = monthRangeKeys(prevMonthDate)

      const ordersThis = all.filter((o) => o.order_date >= thisMonth.start && o.order_date < thisMonth.end)
      const ordersPrev = all.filter((o) => o.order_date >= prevMonth.start && o.order_date < prevMonth.end)

      const emailFirstPurchase = new Map<string, string>()
      for (const o of [...all].sort((a, b) => a.order_date.localeCompare(b.order_date))) {
        if (!o.customer_email) continue
        if (!emailFirstPurchase.has(o.customer_email)) emailFirstPurchase.set(o.customer_email, o.order_date)
      }
      const isRepeat = (o: ShopifyOrder) => {
        if (!o.customer_email) return false
        const first = emailFirstPurchase.get(o.customer_email)
        return first !== o.order_date
      }

      const mrr = ordersThis.filter(isRepeat).reduce((sum, o) => sum + Number(o.total_value), 0)
      const mrrPrevMonth = ordersPrev.filter(isRepeat).reduce((sum, o) => sum + Number(o.total_value), 0)

      const customersPrev = new Set(ordersPrev.map((o) => o.customer_email).filter(Boolean))
      const customersThis = new Set(ordersThis.map((o) => o.customer_email).filter(Boolean))
      let retained = 0
      customersPrev.forEach((email) => { if (customersThis.has(email)) retained++ })
      const retentionRate = customersPrev.size > 0 ? (retained / customersPrev.size) * 100 : null

      const skuUnits = new Map<string, number>()
      for (const o of all) {
        for (const item of o.skus ?? []) {
          skuUnits.set(item.sku, (skuUnits.get(item.sku) ?? 0) + Number(item.quantity ?? 0))
        }
      }
      const topSkus = Array.from(skuUnits.entries())
        .map(([sku, units]) => ({ sku, units }))
        .sort((a, b) => b.units - a.units)

      const aov = ordersThis.length > 0
        ? ordersThis.reduce((sum, o) => sum + Number(o.total_value), 0) / ordersThis.length
        : 0

      return {
        mrr,
        mrrPrevMonth,
        mrrDropped: mrrPrevMonth > 0 && mrr < mrrPrevMonth,
        retentionRate,
        topSkus,
        aov,
        ordersThisMonth: ordersThis.length,
      }
    },
  })
}

export interface DailyRevenuePoint {
  date: string
  revenue: number
  orders: number
}

export function useShopifyDailyRevenue(days = 30) {
  const { data: orders } = useShopifyOrders(1000)

  return useMemo((): DailyRevenuePoint[] => {
    if (!orders) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const byDay = new Map<string, { revenue: number; orders: number }>()
    for (const o of orders) {
      const d = new Date(o.order_date)
      if (d < cutoff) continue
      const key = d.toISOString().slice(0, 10)
      const existing = byDay.get(key) ?? { revenue: 0, orders: 0 }
      existing.revenue += Number(o.total_value)
      existing.orders += 1
      byDay.set(key, existing)
    }

    return Array.from(byDay.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [orders, days])
}

// ============================================================
// CHANNEL COMPARISON (reusa channel_revenue, que já existe)
// ============================================================
export function useChannelRevenueComparison() {
  return useQuery({
    queryKey: ['channel-revenue-comparison'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_revenue')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(60)
      if (error) throw error
      return data ?? []
    },
  })
}
