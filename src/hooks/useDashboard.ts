// src/hooks/useDashboard.ts
// Breakeven e MC lidos diretamente das NFs reais via fn_mc_from_nfs()
// Não há preço hardcoded — cada NF tem seu valor próprio

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface DashboardData {
  // Financeiro
  caixaAtual: number
  receitaSemana: number
  // MC real das NFs
  totalLatas: number
  totalReceita: number
  mcTotal: number
  mcPorLata: number
  breakevenPct: number
  fixedCosts: number
  latasParaBreak: number
  // Comercial
  leadsAtivos: number
  conversoesB2C: number
  eventosMes: number
  // Meta
  periodoFrom: string
  periodoTo: string
  loading: boolean
  error: string | null
  refetch: () => void
}

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function sevenDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

export function useDashboard(): DashboardData {
  const [data, setData] = useState<Omit<DashboardData, 'refetch'>>({
    caixaAtual: 0,
    receitaSemana: 0,
    totalLatas: 0,
    totalReceita: 0,
    mcTotal: 0,
    mcPorLata: 0,
    breakevenPct: 0,
    fixedCosts: 11473.87,
    latasParaBreak: 0,
    leadsAtivos: 0,
    conversoesB2C: 0,
    eventosMes: 0,
    periodoFrom: startOfMonth(),
    periodoTo: today(),
    loading: true,
    error: null,
  })

  const fetchDashboard = async () => {
    setData(prev => ({ ...prev, loading: true, error: null }))

    try {
      const [
        mcResult,
        caixaResult,
        receitaSemanaResult,
        leadsResult,
        b2cResult,
        eventosResult,
      ] = await Promise.all([
        // 1. MC e breakeven direto das NFs reais
        supabase.rpc('fn_mc_from_nfs', {
          p_from: startOfMonth(),
          p_to: today(),
        }),

        // 2. Saldo de caixa (entradas - saídas)
        supabase
          .from('cash_entries')
          .select('type, value'),

        // 3. Receita da semana (entradas últimos 7 dias)
        supabase
          .from('cash_entries')
          .select('value')
          .eq('type', 'entrada')
          .gte('date', sevenDaysAgo()),

        // 4. Leads ativos
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .not('stage', 'in', '("perdido","inativo")'),

        // 5. Conversões B2C no mês
        supabase
          .from('shopify_orders')
          .select('id', { count: 'exact', head: true })
          .gte('order_date', startOfMonth()),

        // 6. Eventos do mês
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .gte('event_date', startOfMonth()),
      ])

      // MC das NFs
      const mc = mcResult.data as any
      const totalLatas      = mc?.total_latas      ?? 0
      const totalReceita    = mc?.total_receita     ?? 0
      const mcTotal         = mc?.mc_total          ?? 0
      const mcPorLata       = mc?.mc_por_lata       ?? 0
      const breakevenPct    = mc?.breakeven_pct     ?? 0
      const fixedCosts      = mc?.fixed_costs       ?? 11473.87
      const latasParaBreak  = mc?.latas_para_break  ?? 0
      const periodoFrom     = mc?.periodo_from      ?? startOfMonth()
      const periodoTo       = mc?.periodo_to        ?? today()

      // Saldo de caixa
      const caixaAtual = (caixaResult.data ?? []).reduce((acc: number, row: any) => {
        return row.type === 'entrada' ? acc + Number(row.value) : acc - Number(row.value)
      }, 0)

      // Receita da semana
      const receitaSemana = (receitaSemanaResult.data ?? []).reduce(
        (acc: number, row: any) => acc + Number(row.value),
        0
      )

      setData({
        caixaAtual: Math.round(caixaAtual * 100) / 100,
        receitaSemana: Math.round(receitaSemana * 100) / 100,
        totalLatas,
        totalReceita,
        mcTotal,
        mcPorLata,
        breakevenPct,
        fixedCosts,
        latasParaBreak,
        leadsAtivos:    leadsResult.count   ?? 0,
        conversoesB2C:  b2cResult.count     ?? 0,
        eventosMes:     eventosResult.count ?? 0,
        periodoFrom,
        periodoTo,
        loading: false,
        error: null,
      })
    } catch (err: any) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: err?.message ?? 'Erro ao carregar dashboard',
      }))
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return { ...data, refetch: fetchDashboard }
}
