import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

const CASH_MINIMUM_FALLBACK = 8000

export function useGlobalAlerts() {
  const { isAuthenticated } = useAuthStore()
  const subscribed = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || subscribed.current) return
    subscribed.current = true

    // ── 1. Novos agent_insights ──────────────────────────────────────
    const insightsChannel = supabase
      .channel('global-agent-insights')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_insights' },
        (payload) => {
          const insight = payload.new as {
            insight_type: 'critico' | 'alerta' | 'sugestao' | 'informativo'
            message: string
            title?: string
          }
          const label = insight.title ?? insight.message.slice(0, 60)

          if (insight.insight_type === 'critico') {
            toast(label, {
              duration: Infinity,
              style: {
                background: '#FBE4EA',
                color: '#c0002c',
                border: '2px solid #E21655',
                fontFamily: 'sans-serif',
                fontSize: '14px',
              },
              icon: '🚨',
            })
          } else if (insight.insight_type === 'alerta') {
            toast(label, {
              duration: 8000,
              style: {
                background: '#FEEDC1',
                color: '#7a4c00',
                border: '1px solid #FAAE1A',
                fontFamily: 'sans-serif',
                fontSize: '14px',
              },
              icon: '⚠️',
            })
          } else if (insight.insight_type === 'sugestao') {
            toast(label, {
              duration: 5000,
              style: {
                background: '#E6F0D7',
                color: '#2a6600',
                border: '1px solid #6BB42E',
                fontFamily: 'sans-serif',
                fontSize: '14px',
              },
              icon: '💡',
            })
          }
        },
      )
      .subscribe()

    // ── 2. Mudanças no caixa (cash_entries) ──────────────────────────
    const cashChannel = supabase
      .channel('global-cash-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_entries' },
        async () => {
          // Busca saldo atual e mínimo de caixa configurado
          const [{ data: entries }, { data: minSetting }] = await Promise.all([
            supabase.from('cash_entries').select('type, value'),
            supabase
              .from('business_constants')
              .select('value')
              .eq('key', 'cash_minimum')
              .maybeSingle(),
          ])

          const cashMinimum =
            (minSetting?.value as number | null) ?? CASH_MINIMUM_FALLBACK

          const saldo = (entries ?? []).reduce(
            (acc: number, e: { type: string; value: number }) =>
              acc + (e.type === 'entrada' ? e.value : -e.value),
            0,
          )

          if (saldo < cashMinimum) {
            toast(`Caixa abaixo do mínimo: R$${saldo.toFixed(2)} (mínimo R$${cashMinimum.toFixed(2)})`, {
              duration: Infinity,
              style: {
                background: '#FBE4EA',
                color: '#c0002c',
                border: '2px solid #E21655',
                fontFamily: 'sans-serif',
                fontSize: '14px',
              },
              icon: '💰',
            })
          }
        },
      )
      .subscribe()

    // ── 3. Eventos em execução ────────────────────────────────────────
    const eventsChannel = supabase
      .channel('global-events-execucao')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          const ev = payload.new as { stage: string; name?: string }
          if (ev.stage === 'em_execucao') {
            toast(`Evento em execução: ${ev.name ?? 'Evento'}`, {
              duration: 6000,
              style: {
                background: '#E6F0D7',
                color: '#2a6600',
                border: '1px solid #6BB42E',
                fontFamily: 'sans-serif',
                fontSize: '14px',
              },
              icon: '🎉',
            })
          }
        },
      )
      .subscribe()

    return () => {
      subscribed.current = false
      supabase.removeChannel(insightsChannel)
      supabase.removeChannel(cashChannel)
      supabase.removeChannel(eventsChannel)
    }
  }, [isAuthenticated])
}
