// ============================================================
// agent-ads-reviewer
// Runs every Monday at 09:00 BRT (12:00 UTC):
//   SELECT cron.schedule('agent-ads-monday', '0 12 * * 1',
//     $$ SELECT net.http_post(
//          url:='https://szcaggkwvtghgravfqrs.supabase.co/functions/v1/agent-ads-reviewer',
//          headers:='{"Content-Type":"application/json"}'::jsonb
//        ) $$ );
// ============================================================
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { callClaude } from '../_shared/claudeClient.ts'
import { saveInsight } from '../_shared/saveInsight.ts'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'

const SYSTEM_PROMPT = `Você é o agente de mídia sênior da Guadalupe. Analise as campanhas ativas e identifique: 1) Campanhas com ROAS abaixo de 2x que devem ser pausadas. 2) Campanhas para escalar (ROAS > 4x). 3) Distribuição 70/20/10 — está sendo respeitada? 4) Uma ação prioritária esta semana. Seja direto.`

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const supabase = getSupabaseAdmin()

  try {
    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('status', 'ativa')

    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ ok: true, campaigns: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Attach performance rows if available
    const campaignIds = campaigns.map((c: any) => c.id)
    const { data: performance } = await supabase
      .from('ad_performance')
      .select('*')
      .in('campaign_id', campaignIds)
      .order('date', { ascending: false })

    const userMessage = JSON.stringify({
      active_campaigns: campaigns,
      recent_performance: performance ?? [],
      budget_rule: '70% awareness / 20% consideration / 10% conversion',
    })

    const analysis = await callClaude(SYSTEM_PROMPT, userMessage, 800)

    const lowRoas = campaigns.filter((c: any) => c.roas != null && Number(c.roas) < 2)
    const highRoas = campaigns.filter((c: any) => c.roas != null && Number(c.roas) > 4)

    const title = `Revisão semanal de campanhas — ${campaigns.length} ativas${lowRoas.length ? `, ${lowRoas.length} abaixo de 2x ROAS` : ''}`

    await saveInsight(
      'agent-ads-reviewer',
      'sugestao',
      title,
      analysis || 'Análise não disponível.',
      'Ver Mídia',
      '/marketing?tab=ads',
      { campaigns: campaigns.length, low_roas: lowRoas.length, high_roas: highRoas.length },
    )

    return new Response(JSON.stringify({ ok: true, campaigns: campaigns.length, low_roas: lowRoas.length, high_roas: highRoas.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('agent-ads-reviewer error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
