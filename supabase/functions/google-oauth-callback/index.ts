import { createClient } from 'npm:@supabase/supabase-js@2'

function getSupabaseAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getAppSetting(supabase: any, key: string): Promise<string | null> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle()
  if (!data?.value) return null
  return typeof data.value === 'string' ? data.value : String(data.value)
}

async function setAppSetting(supabase: any, key: string, value: string) {
  await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' })
}

const HTML_HEAD = '<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#FFFBF0;">'

// Callback de redirect para um cliente OAuth tipo "Web application" do Google
// (uso futuro/alternativo). O fluxo principal de setup é o script local
// scripts/setup-google-oauth.ts, que usa um cliente tipo "Desktop app" com
// redirect loopback (http://localhost) e não passa por esta função.
Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return new Response(HTML_HEAD + '<h2 style="color:#E21655">Falta o codigo de autorizacao na URL.</h2></body></html>', { headers: { 'Content-Type': 'text/html' } })
  }

  const supabase = getSupabaseAdmin()
  const clientId = await getAppSetting(supabase, 'google_client_id')
  const clientSecret = await getAppSetting(supabase, 'google_client_secret')

  if (!clientId || !clientSecret) {
    return new Response(HTML_HEAD + '<h2 style="color:#E21655">google_client_id / google_client_secret ainda nao configurados em app_settings. Avise o Raphael.</h2></body></html>', { headers: { 'Content-Type': 'text/html' } })
  }

  try {
    const redirectUri = `${url.origin}/functions/v1/google-oauth-callback`
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(HTML_HEAD + `<h2 style="color:#E21655">Erro do Google: ${JSON.stringify(data)}</h2></body></html>`, { headers: { 'Content-Type': 'text/html' } })
    }

    await setAppSetting(supabase, 'google_access_token', data.access_token)
    if (data.refresh_token) {
      await setAppSetting(supabase, 'google_refresh_token', data.refresh_token)
    }
    await setAppSetting(supabase, 'google_token_expires_at', String(Date.now() + (data.expires_in ?? 3600) * 1000))

    return new Response(
      HTML_HEAD + '<h1 style="color:#6BB42E">Conectado com sucesso!</h1><p>O Google Sheets ja esta autorizado no Guadalupe OS. Pode fechar essa aba.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } },
    )
  } catch (err) {
    return new Response(HTML_HEAD + `<h2 style="color:#E21655">Erro: ${String(err)}</h2></body></html>`, { headers: { 'Content-Type': 'text/html' } })
  }
})
