import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const CUSTO_FIXO = 11473.87

// CMV de produção por SKU (Dádiva)
const CMV_SKU: Record<string, number> = {
  mango_sour: 3.82,
  margarita_lime: 3.93,
  paloma_grapefruit: 4.02,
}
const CMV_DEFAULT = 3.86

// Preço de venda por canal (conservador = on-trade)
// MC = preço - CMV — essa é a margem de contribuição real por lata
const PRECO_ONTRADE = 10.00
const CMV_MEDIO = 3.86
const MC_POR_LATA = PRECO_ONTRADE - CMV_MEDIO  // R$6,14 — pior caso (on-trade puro)

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}
function sevenDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}
function daysRemainingInMonth() {
  const d = new Date()
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return lastDay - d.getDate()
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const mesAtual = startOfMonth()
      const semanaAtras = sevenDaysAgo()

      const [caixaRes, receitaSemanaRes, inventarioMesRes,
             leadsRes, eventosRes, shopifyRes] = await Promise.all([

        supabase.from('cash_entries').select('type, value'),

        supabase.from('cash_entries').select('value')
          .eq('type', 'entrada').gte('date', semanaAtras),

        // Unidades vendidas este mês por SKU
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

      // Breakeven por MC:
      // MC gerada = Σ (unidades_vendidas × (preço - cmv_sku))
      // Por enquanto usa preço on-trade como conservador — atualizar quando mix confirmado
      const unidadesMes = (inventarioMesRes.data || [])
      const totalUnidades = unidadesMes.reduce((acc, r) => acc + Number(r.units), 0)

      const mcGerada = unidadesMes.reduce((acc, r) => {
        const cmv = CMV_SKU[r.sku] ?? CMV_DEFAULT
        const mc = PRECO_ONTRADE - cmv  // MC conservadora (on-trade)
        return acc + mc * Number(r.units)
      }, 0)

      // % do breakeven atingida
      const breakevenPct = CUSTO_FIXO > 0
        ? Math.round((mcGerada / CUSTO_FIXO) * 100)
        : 0

      // Latas ainda necessárias para fechar breakeven
      const mcFaltante = Math.max(0, CUSTO_FIXO - mcGerada)
      const lataNecessarias = Math.ceil(mcFaltante / MC_POR_LATA)
      const diasRestantes = daysRemainingInMonth()
      const lataPorDia = diasRestantes > 0
        ? Math.ceil(lataNecessarias / diasRestantes)
        : lataNecessarias

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

      const conversoesMes = shopifyRes.data?.length ?? 0

      return {
        caixaAtual,
        receitaSemana,
        breakevenPct,
        lataNecessarias,
        lataPorDia,
        totalUnidades,
        diasRestantes,
        leadsAtivos,
        eventosMes,
        emExecucao,
        receitaEventos,
        ugcsGerados,
        conversoesMes,
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
