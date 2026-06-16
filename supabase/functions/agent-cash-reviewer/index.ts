// ============================================================
// agent-cash-reviewer
// Runs daily at 08:00 BRT (11:00 UTC) via pg_cron:
//   SELECT cron.schedule('agent-cash-08h', '0 11 * * *',
//     $$ SELECT net.http_post(
//          url:='https://szcaggkwvtghgravfqrs.supabase.co/functions/v1/agent-cash-reviewer',
//          headers:='{"Content-Type":"application/json"}'::jsonb
//        ) $$ );
// ============================================================
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { callClaude } from '../_shared/claudeClient.ts'
import { saveInsight } from '../_shared/saveInsight.ts'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'

const SYSTEM_PROMPT = `Você é o agente financeiro da Guadalupe, uma marca de tequila soda RTD brasileira. Seu papel é revisar a posição de caixa diária e identificar riscos e oportunidades. Seja direto e prático. Foco em: 1) Risco de caixa abaixo de R$8.000. 2) Tendência dos últimos 7 dias. 3) Uma ação concreta recomendada. Limite: 3 frases.`

const CASH_ALERT = 8000
const CASH_WARN = 12000

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const supabase = getSupabaseAdmin()

  try {
    const since = new Date()
    since.setDate(since.getDate() - 7)

    const [{ data: cashFlows }, { data: balance }] = await Promise.all([
      supabase
        .from('cash_flow')
        .select('date, type, amount, description, category')
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: false }),
      supabase
        .from('cash_flow')
        .select('amount, type')
        .order('date', { ascending: false }),
    ])

    const currentBalance = (balance ?? []).reduce((acc: number, row: any) => {
      return acc + (row.type === 'entrada' ? Number(row.amount) : -Number(row.amount))
    }, 0)

    const userMessage = JSON.stringify({
      current_balance: currentBalance,
      breakeven_target: 24000,
      fixed_costs: 12000,
      cash_alert_threshold: 8000,
      last_7_days: cashFlows ?? [],
    })

    const analysis = await callClaude(SYSTEM_PROMPT, userMessage, 500)

    const insightType =
      currentBalance < CASH_ALERT ? 'critico' :
      currentBalance < CASH_WARN ? 'alerta' :
      'informativo'

    const title =
      insightType === 'critico' ? `⚠️ Caixa crítico: R$ ${currentBalance.toFixed(2)}` :
      insightType === 'alerta' ? `Caixa abaixo do recomendado: R$ ${currentBalance.toFixed(2)}` :
      `Revisão diária de caixa — R$ ${currentBalance.toFixed(2)}`

    await saveInsight(
      'agent-cash-reviewer',
      insightType,
      title,
      analysis || 'Análise não disponível no momento.',
      'Ver Financeiro',
      '/financeiro',
      { balance: currentBalance },
    )

    return new Response(JSON.stringify({ ok: true, balance: currentBalance, insightType }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('agent-cash-reviewer error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
