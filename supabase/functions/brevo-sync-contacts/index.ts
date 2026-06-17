import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  const supabase = getSupabaseAdmin()

  try {
    const apiKey = await getAppSetting(supabase, 'brevo_api_key')
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'brevo_api_key nao configurado em app_settings.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const listIdStr = await getAppSetting(supabase, 'brevo_list_id_all_subscribers')
    const listId = listIdStr ? Number(listIdStr) : null

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('name, email, phone, canal')
      .not('email', 'is', null)

    if (leadsError) throw leadsError

    let synced = 0
    let failed = 0
    const errors: string[] = []

    for (const lead of leads ?? []) {
      if (!lead.email || !lead.email.includes('@')) continue

      const payload: any = {
        email: lead.email,
        attributes: {
          NOME: lead.name ?? '',
          TELEFONE: lead.phone ?? '',
          CANAL: lead.canal ?? '',
        },
        updateEnabled: true,
      }
      if (listId) payload.listIds = [listId]

      const res = await fetch(`${BREVO_API}/contacts`, {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok || res.status === 204) {
        synced++
      } else {
        const errText = await res.text()
        failed++
        errors.push(`${lead.email}: ${errText}`)
      }
    }

    if (failed > 0) {
      await supabase.from('agent_insights').insert({
        agent_name: 'brevo-sync-contacts',
        insight_type: 'alerta',
        title: `${failed} contato(s) falharam ao sincronizar com Brevo`,
        message: `Sincronizacao semanal: ${synced} sincronizados, ${failed} falharam. Primeiros erros: ${errors.slice(0, 3).join(' | ')}`,
        action_label: 'Ver Marketing',
        action_url: '/marketing',
      })
    }

    return new Response(JSON.stringify({ ok: true, synced, failed }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('brevo-sync-contacts error', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
