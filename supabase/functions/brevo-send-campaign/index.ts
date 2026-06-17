import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function getSupabaseAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false, autoRefreshToken: false } })
}

async function getAppSetting(supabase: any, key: string): Promise<string | null> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle()
  if (data?.value === undefined || data?.value === null) return null
  const v = typeof data.value === 'string' ? data.value : String(data.value)
  return v === 'null' ? null : v
}

const BREVO_API = 'https://api.brevo.com/v3'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabase = getSupabaseAdmin()

  try {
    const apiKey = await getAppSetting(supabase, 'brevo_api_key')
    if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'brevo_api_key nao configurado em app_settings.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = await req.json()
    const { campaign_name, subject, html_content, recipient_segment, send_at } = body

    if (!campaign_name || !subject || !html_content || !recipient_segment) {
      return new Response(JSON.stringify({ ok: false, error: 'campos obrigatorios: campaign_name, subject, html_content, recipient_segment' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let listIds: number[] = []

    if (recipient_segment === 'all_subscribers') {
      const listIdStr = await getAppSetting(supabase, 'brevo_list_id_all_subscribers')
      if (!listIdStr) throw new Error('brevo_list_id_all_subscribers nao configurado em app_settings')
      listIds = [Number(listIdStr)]
    } else if (recipient_segment === 'event_attendees') {
      return new Response(JSON.stringify({ ok: false, error: 'Segmento event_attendees requer lista dedicada no Brevo. Use brevo-sync-contacts com tag apropriada primeiro.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else if (recipient_segment === 'inactive_30days') {
      return new Response(JSON.stringify({ ok: false, error: 'Segmento inactive_30days depende de dados de abertura que vivem no Brevo. Crie segmento dinamico no painel Brevo e use o list ID dele.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else {
      return new Response(JSON.stringify({ ok: false, error: `recipient_segment invalido: ${recipient_segment}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const campaignPayload: any = { name: campaign_name, subject, htmlContent: html_content, sender: { name: 'Guadalupe', email: 'contato@guadalupedrink.com.br' }, recipients: { listIds } }
    if (send_at) campaignPayload.scheduledAt = send_at

    const createRes = await fetch(`${BREVO_API}/emailCampaigns`, { method: 'POST', headers: { 'api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(campaignPayload) })
    const createData = await createRes.json()
    if (!createRes.ok) throw new Error(`Brevo API error (${createRes.status}): ${JSON.stringify(createData)}`)

    const campaignId = createData.id

    if (!send_at) {
      const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${campaignId}/sendNow`, { method: 'POST', headers: { 'api-key': apiKey, 'Accept': 'application/json' } })
      if (!sendRes.ok) {
        const sendErr = await sendRes.text()
        return new Response(JSON.stringify({ ok: true, campaign_id: campaignId, warning: `Campanha criada mas envio imediato falhou: ${sendErr}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    return new Response(JSON.stringify({ ok: true, campaign_id: campaignId, scheduled: !!send_at }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('brevo-send-campaign error', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
