// ============================================================
// agent-lead-followup
// Runs every 4 hours via pg_cron:
//   SELECT cron.schedule('agent-leads-4h', '0 */4 * * *',
//     $$ SELECT net.http_post(
//          url:='https://szcaggkwvtghgravfqrs.supabase.co/functions/v1/agent-lead-followup',
//          headers:='{"Content-Type":"application/json"}'::jsonb
//        ) $$ );
// ============================================================
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { callClaude } from '../_shared/claudeClient.ts'
import { saveInsight } from '../_shared/saveInsight.ts'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'

const SYSTEM_PROMPT = `Você é o agente de CRM da Guadalupe. Liste de forma concisa quais leads precisam de follow-up urgente e por quê. Priorize por tempo parado e estágio do funil. Máximo 5 leads. Formato: 'NOME/EMPRESA — X horas parado — Ação sugerida: Y'.`

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const supabase = getSupabaseAdmin()

  try {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 24)

    const { data: leads } = await supabase
      .from('leads')
      .select('id, nome, empresa, stage, canal, last_activity_at, valor_estimado, responsavel')
      .lt('last_activity_at', cutoff.toISOString())
      .not('stage', 'in', '("inativo","perdido")')
      .order('last_activity_at', { ascending: true })
      .limit(20)

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ ok: true, leads: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = Date.now()
    const enriched = leads.map((l: any) => ({
      ...l,
      hours_idle: Math.round((now - new Date(l.last_activity_at).getTime()) / 3_600_000),
    }))

    const analysis = await callClaude(SYSTEM_PROMPT, JSON.stringify(enriched), 600)

    await saveInsight(
      'agent-lead-followup',
      'alerta',
      `${leads.length} lead${leads.length > 1 ? 's' : ''} aguardando follow-up`,
      analysis || 'Análise não disponível no momento.',
      'Ver CRM',
      '/crm',
    )

    return new Response(JSON.stringify({ ok: true, leads: leads.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('agent-lead-followup error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
