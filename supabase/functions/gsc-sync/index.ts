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

function base64UrlEncode(input: Uint8Array): string {
  let str = ''
  for (const byte of input) str += String.fromCharCode(byte)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const creds = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const enc = (obj: any) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)))
  const unsigned = `${enc(header)}.${enc(claim)}`

  const pemContents = creds.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }).toString(),
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Google OAuth error (${tokenRes.status}): ${text}`)
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

function mondayOf(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = getSupabaseAdmin()

  try {
    const serviceAccountKey = await getAppSetting(supabase, 'gsc_service_account_key')
    const siteUrl = await getAppSetting(supabase, 'gsc_site_url')

    if (!serviceAccountKey || !siteUrl) {
      return new Response(JSON.stringify({ ok: false, error: 'gsc_service_account_key e/ou gsc_site_url nao configurados em app_settings.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const accessToken = await getGoogleAccessToken(serviceAccountKey)

    const encodedSite = encodeURIComponent(siteUrl)
    const queryRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: isoDaysAgo(7), endDate: isoDaysAgo(0), dimensions: ['query'], rowLimit: 25 }),
    })

    if (!queryRes.ok) {
      const text = await queryRes.text()
      throw new Error(`GSC API error (${queryRes.status}): ${text}`)
    }

    const queryData = await queryRes.json()
    const rows = queryData.rows ?? []
    const weekStart = mondayOf(new Date())

    let upserted = 0
    for (const row of rows) {
      const keyword = row.keys?.[0] ?? ''
      if (!keyword) continue

      const { error } = await supabase.from('gsc_keywords').upsert({
        week_start: weekStart,
        query: keyword,
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? null,
      }, { onConflict: 'week_start,query' })

      if (!error) upserted++
    }

    const trackedRaw = await getAppSetting(supabase, 'gsc_tracked_keywords')
    const tracked: string[] = trackedRaw ? JSON.parse(trackedRaw) : []

    const previousWeekStart = isoDaysAgo(14)
    for (const keyword of tracked) {
      const { data: currentRow } = await supabase.from('gsc_keywords').select('position').eq('week_start', weekStart).eq('query', keyword).maybeSingle()
      const { data: previousRows } = await supabase
        .from('gsc_keywords')
        .select('position, week_start')
        .eq('query', keyword)
        .lt('week_start', weekStart)
        .gte('week_start', previousWeekStart)
        .order('week_start', { ascending: false })
        .limit(1)

      const previousRow = previousRows?.[0]
      if (currentRow?.position != null && previousRow?.position != null) {
        const drop = Number(currentRow.position) - Number(previousRow.position)
        if (drop > 5) {
          await supabase.from('agent_insights').insert({
            agent_name: 'gsc-sync',
            insight_type: 'alerta',
            title: `Palavra-chave "${keyword}" caiu mais de 5 posicoes no Google`,
            message: `Posicao foi de ${Number(previousRow.position).toFixed(1)} para ${Number(currentRow.position).toFixed(1)} (queda de ${drop.toFixed(1)} posicoes) na semana de ${weekStart}.`,
            action_label: 'Ver SEO',
            action_url: '/marketing',
          })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, week_start: weekStart, keywords_synced: upserted }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('gsc-sync error', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
