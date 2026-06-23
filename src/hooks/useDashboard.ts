import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const CUSTO_FIXO = 11473.87

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

function sevenDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const mesAtual = startOfMonth()
      const semanaAtras = sevenDaysAgo()

      const [caixaRes, receitaSemanaRes, receitaMesRes, leadsRes, eventosRes, shopifyRes] =
        await Promise.all([
          // 1. Caixa atual
          supabase
            .from('cash_entries')
            .select('type, value'),

          // 2. Receita últimos 7 dias
          supabase
            .from('cash_entries')
            .select('value')
            .eq('type', 'entrada')
            .gte('date', semanaAtras),

          // 3. Receita mês atual (para breakeven)
          supabase
            .from('cash_entries')
            .select('value')
            .eq('type', 'entrada')
            .gte('date', mesAtual),

          // 4. Leads ativos (não perdidos)
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .not('stage', 'in', '("perdido","inativo","lost")'),

          // 5. Eventos
          supabase
            .from('events')
            .select('stage, actual_revenue, estimated_revenue, ugc_count, event_date'),

          // 6. B2C / Shopify este mês
          supabase
            .from('shopify_orders')
            .select('total_value')
            .gt('total_value', 0)
            .gte('order_date', mesAtual),
        ])

      // Caixa atual
      const caixaAtual = (caixaRes.data || []).reduce(
        (acc, r) => acc + (r.type === 'entrada' ? Number(r.value) : -Number(r.value)),
        0
      )

      // Receita semana
      const receitaSemana = (receitaSemanaRes.data || []).reduce(
        (acc, r) => acc + Number(r.value), 0
      )

      // Breakeven % do mês
      const receitaMes = (receitaMesRes.data || []).reduce(
        (acc, r) => acc + Number(r.value), 0
      )
      const breakevenPct = Math.round((receitaMes / CUSTO_FIXO) * 100)

      // Leads ativos
      const leadsAtivos = leadsRes.count ?? 0

      // Eventos
      const eventos = eventosRes.data || []
      const hoje = new Date()
      const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const mesFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      const eventosMes = eventos.filter(e => {
        if (!e.event_date) return false
        const d = new Date(e.event_date)
        return d >= mesInicio && d <= mesFim
      }).length
      const emExecucao = eventos.filter(e =>
        e.stage === 'em_execucao' || e.stage === 'execucao' || e.stage === 'happening'
      ).length
      const receitaEventos = eventos.reduce(
        (acc, e) => acc + Number(e.actual_revenue || e.estimated_revenue || 0), 0
      )
      const ugcsGerados = eventos.reduce((acc, e) => acc + Number(e.ugc_count || 0), 0)

      // B2C
      const conversoesMes = shopifyRes.data?.length ?? 0

      return {
        caixaAtual,
        receitaSemana,
        breakevenPct,
        leadsAtivos,
        eventosMes,
        emExecucao,
        receitaEventos,
        ugcsGerados,
        conversoesMes,
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })
}
