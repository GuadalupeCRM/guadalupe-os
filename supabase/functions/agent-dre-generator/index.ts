// ============================================================
// agent-dre-generator
// Runs on 1st of each month at 06:00 BRT (09:00 UTC):
//   SELECT cron.schedule('agent-dre-monthly', '0 9 1 * *',
//     $$ SELECT net.http_post(
//          url:='https://szcaggkwvtghgravfqrs.supabase.co/functions/v1/agent-dre-generator',
//          headers:='{"Content-Type":"application/json"}'::jsonb
//        ) $$ );
// ============================================================
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { callClaude } from '../_shared/claudeClient.ts'
import { saveInsight } from '../_shared/saveInsight.ts'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'

const SYSTEM_PROMPT = `Você é o agente DRE da Guadalupe. Com base nos dados do mês passado, gere um resumo executivo do DRE. Inclua: resultado líquido, canal mais rentável, maior custo identificado, e UMA recomendação estratégica para o próximo mês. Tom: direto, sem enrolação, como um CFO.`

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const supabase = getSupabaseAdmin()

  try {
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastOfPrevMonth = new Date(firstOfMonth.getTime() - 1)

    const iso = (d: Date) => d.toISOString().slice(0, 10)

    const [
      { data: channelRevenue },
      { data: cashFlows },
      { data: movements },
      { data: nfs },
    ] = await Promise.all([
      supabase
        .from('channel_revenue')
        .select('*')
        .gte('date', iso(firstOfPrevMonth))
        .lte('date', iso(lastOfPrevMonth)),
      supabase
        .from('cash_flow')
        .select('date, type, amount, category, description')
        .gte('date', iso(firstOfPrevMonth))
        .lte('date', iso(lastOfPrevMonth)),
      supabase
        .from('inventory_movements')
        .select('date, sku, type, units')
        .gte('date', iso(firstOfPrevMonth))
        .lte('date', iso(lastOfPrevMonth)),
      supabase
        .from('bling_nfs')
        .select('nf_number, canal, valor, data, status')
        .gte('data', iso(firstOfPrevMonth))
        .lte('data', iso(lastOfPrevMonth)),
    ])

    const month = firstOfPrevMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

    const userMessage = JSON.stringify({
      periodo: month,
      channel_revenue: channelRevenue ?? [],
      cash_flow: cashFlows ?? [],
      inventory_movements: movements ?? [],
      bling_nfs: nfs ?? [],
      fixed_costs: 12000,
      breakeven: 24000,
    })

    const analysis = await callClaude(SYSTEM_PROMPT, userMessage, 1200)

    const title = `DRE ${month} — Resumo Executivo`

    await saveInsight(
      'agent-dre-generator',
      'informativo',
      title,
      analysis || 'DRE não disponível.',
      'Ver Financeiro',
      '/financeiro',
      { period: month },
    )

    return new Response(JSON.stringify({ ok: true, period: month }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('agent-dre-generator error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
