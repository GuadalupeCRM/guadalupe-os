import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Custo fixo mensal confirmado (YM + operacional + estrutura)
const CUSTO_FIXO = 11473.87

// CMV de produção por SKU (lata saindo da Dádiva)
const CMV: Record<string, number> = {
  mango_sour: 3.82,
  margarita_lime: 3.93,
  paloma_grapefruit: 4.02,
}

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

      const [caixaRes, receitaSemanaRes, receitaMesRes, inventarioMesRes,
             leadsRes, eventosRes, shopifyRes] = await Promise.all([

        supabase.from('cash_entries').select('type, value'),

        supabase.from('cash_entries').select('value')
          .eq('type', 'entrada').gte('date', semanaAtras),

        supabase.from('cash_entries').select('value')
          .eq('type', 'entrada').eq('category', 'vendas').gte('date', mesAtual),

        // Unidades vendidas este mês (saídas do inventário)
        supabase.from('inventory_movements').select('sku, units')
          .eq('type', 'saida').gte('date', mesAtual),

        supabase.from('leads').select('id', { count: 'exact', head: true })
          .not('stage', 'in', '("perdido","inativo","lost")'),

        supabase.from('events').select('stage, actual_revenue, estimated_revenue, ugc_count, event_date'),

        supabase.from('shopify_orders').select('total_value')
          .gt('total_value', 0).gte('order_date', mesAtual),
      ])

      // Caixa atual
      const caixaAtual = (caixaRes.data || []).reduce(
        (acc, r) => acc + (r.type === 'entrada' ? Number(r.value) : -Number(r.value)), 0
      )

      // Receita semana
      const receitaSemana = (receitaSemanaRes.data || []).reduce(
        (acc, r) => acc + Number(r.value), 0
      )

      // MC = receita vendas - CMV produção das unidades registradas
      // Nota: não inclui custos variáveis de canal (frete, staff evento) — esses ficam em cash_entries saídas
      const receitaVendasMes = (receitaMesRes.data || []).reduce(
        (acc, r) => acc + Number(r.value), 0
      )
      const cmvMes = (inventarioMesRes.data || []).reduce(
        (acc, r) => acc + (CMV[r.sku] ?? 3.86) * Number(r.units), 0
      )
      const margemContribuicao = receitaVendasMes - cmvMes
      const breakevenPct = CUSTO_FIXO > 0
        ? Math.min(999, Math.round((margemContribuicao / CUSTO_FIXO) * 100))
        : 0

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
        ['em_execucao', 'execucao', 'happening'].includes(e.stage)
      ).length
      const receitaEventos = eventos.reduce(
        (acc, e) => acc + Number(e.actual_revenue || e.estimated_revenue || 0), 0
      )
      const ugcsGerados = eventos.reduce((acc, e) => acc + Number(e.ugc_count || 0), 0)

      // B2C
      const conversoesMes = shopifyRes.data?.length ?? 0

      return {
        caixaAtual, receitaSemana, breakevenPct,
        leadsAtivos, eventosMes, emExecucao,
        receitaEventos, ugcsGerados, conversoesMes,
        // debug
        _receitaVendasMes: receitaVendasMes,
        _cmvMes: cmvMes,
        _margemContribuicao: margemContribuicao,
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })
}
