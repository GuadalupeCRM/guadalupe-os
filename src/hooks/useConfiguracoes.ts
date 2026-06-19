import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../types'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://szcaggkwvtghgravfqrs.supabase.co'

// ============================================================
// USUÁRIOS
// ============================================================
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

export function useInviteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; full_name: string; role: UserRole }) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.email, password: Math.random().toString(36).slice(-10), full_name: input.full_name, role: input.role }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Erro ao convidar usuário')

      await supabase.auth.resetPasswordForEmail(input.email, { redirectTo: `${window.location.origin}/redefinir-senha` })
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, role }: { profileId: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from('profiles').update({ active: false }).eq('id', profileId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

// ============================================================
// CONSTANTES DE NEGÓCIO
// ============================================================
export interface BusinessConstant {
  key: string
  value: unknown
  label: string
  category: string
  updated_at: string
}

export function useBusinessConstants() {
  return useQuery({
    queryKey: ['business-constants'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<BusinessConstant[]> => {
      const { data, error } = await supabase.from('business_constants').select('*').order('category')
      if (error) throw error
      return (data ?? []) as BusinessConstant[]
    },
  })
}

export function useUpdateBusinessConstant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value, changedBy }: { key: string; value: unknown; changedBy: string }) => {
      const { data: existing } = await supabase.from('business_constants').select('value').eq('key', key).maybeSingle()

      const { error } = await supabase.from('business_constants').update({ value, updated_at: new Date().toISOString(), updated_by: changedBy }).eq('key', key)
      if (error) throw error

      await supabase.from('settings_audit').insert({
        setting_key: key,
        old_value: existing?.value != null ? JSON.stringify(existing.value) : null,
        new_value: JSON.stringify(value),
        changed_by: changedBy,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business-constants'] }),
  })
}

export function useInventorySettings() {
  return useQuery({
    queryKey: ['inventory-settings-config'],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_settings').select('*')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useUpdateReorderPointConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sku, reorder_point }: { sku: string; reorder_point: number }) => {
      const { error } = await supabase.from('inventory_settings').upsert({ sku, reorder_point, updated_at: new Date().toISOString() }, { onConflict: 'sku' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-settings-config'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useCMVComponentsConfig() {
  return useQuery({
    queryKey: ['cmv-components-config'],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from('cmv_components').select('*').order('sku').order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useUpdateCMVComponentConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase.from('cmv_components').update({ value, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cmv-components-config'] })
      queryClient.invalidateQueries({ queryKey: ['cmv-components'] })
    },
  })
}

// ============================================================
// INTEGRAÇÕES
// ============================================================
export interface IntegrationStatus {
  key: string
  name: string
  connected: boolean
  account?: string
}

const INTEGRATIONS = [
  { key: 'bling', name: 'Bling ERP' },
  { key: 'brevo', name: 'Brevo' },
  { key: 'instagram', name: 'Instagram' },
  { key: 'gsc', name: 'Google Search Console' },
  { key: 'shopify', name: 'Shopify' },
] as const

export function useIntegrationsStatus() {
  return useQuery({
    queryKey: ['integrations-status'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<IntegrationStatus[]> => {
      const results = await Promise.all(
        INTEGRATIONS.map(async (i) => {
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/get-connection-status?service=${i.key}`)
            const data = await res.json()
            return { key: i.key, name: i.name, connected: !!data.connected, account: data.account }
          } catch {
            return { key: i.key, name: i.name, connected: false }
          }
        }),
      )
      return results
    },
  })
}

export function useLastBlingWebhook() {
  return useQuery({
    queryKey: ['last-bling-webhook'],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from('bling_nfs').select('synced_at, nf_number').order('synced_at', { ascending: false }).limit(1).maybeSingle()
      return data
    },
  })
}

// ============================================================
// CANAIS
// ============================================================
export interface ChannelSetting {
  canal_type: string
  display_name: string
  color: string
  freight_avg: number
  enabled: boolean
  updated_at: string
}

export function useChannelSettings() {
  return useQuery({
    queryKey: ['channel-settings'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ChannelSetting[]> => {
      const { data, error } = await supabase.from('channel_settings').select('*').order('canal_type')
      if (error) throw error
      return (data ?? []) as ChannelSetting[]
    },
  })
}

export function useUpdateChannelSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<ChannelSetting> & { canal_type: string }) => {
      const { error } = await supabase.from('channel_settings').update({ ...input, updated_at: new Date().toISOString() }).eq('canal_type', input.canal_type)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channel-settings'] }),
  })
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================
export interface NotificationSetting {
  user_id: string
  whatsapp_number: string | null
  cash_alerts: boolean
  lead_followup_alerts: boolean
  ads_budget_alerts: boolean
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<NotificationSetting[]> => {
      const { data, error } = await supabase.from('notification_settings').select('*')
      if (error) throw error
      return (data ?? []) as NotificationSetting[]
    },
  })
}

export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<NotificationSetting> & { user_id: string }) => {
      const { error } = await supabase.from('notification_settings').upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-settings'] }),
  })
}
