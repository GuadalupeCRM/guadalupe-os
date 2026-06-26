// scripts/setup-google-oauth.ts
//
// Configura a autorização OAuth do Google (cliente tipo "Desktop app") usada
// pela Edge Function google-drive-sync para ler o Google Sheets sozinha.
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> npm run setup:google-oauth
//
// O SUPABASE_URL já tem um default (projeto Guadalupe OS), mas pode ser
// sobrescrito via env var se necessário. O GOOGLE_CLIENT_ID e
// GOOGLE_CLIENT_SECRET podem vir por env var; se não vierem, o script
// pergunta no terminal (não ficam salvos em nenhum arquivo local).
//
// O que o script faz:
//   1. Pergunta (ou lê do env) o Client ID e Client Secret do OAuth
//      "Desktop app" criado no Google Cloud Console.
//   2. Sobe um servidor HTTP local em http://localhost:53682 e abre/imprime
//      a URL de autorização do Google.
//   3. Você abre a URL no navegador, faz login e autoriza.
//   4. O Google redireciona para http://localhost:53682/?code=... — o script
//      captura o "code" automaticamente.
//   5. Troca o code por um refresh_token (POST oauth2.googleapis.com/token).
//   6. Salva google_client_id, google_client_secret e google_refresh_token em
//      app_settings via Supabase (usando a service_role key).
//
// Depois disso, a Edge Function google-drive-sync consegue gerar access_tokens
// novos sozinha a partir do refresh_token, sem precisar repetir esse processo.

import { createClient } from '@supabase/supabase-js'
import * as http from 'node:http'
import * as readline from 'node:readline/promises'

const PORT = 53682
const REDIRECT_URI = `http://localhost:${PORT}`
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://szcaggkwvtghgravfqrs.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(question)
  rl.close()
  return answer.trim()
}

async function waitForAuthCode(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', REDIRECT_URI)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(`<h2>Erro: ${error}</h2><p>Pode fechar essa aba e checar o terminal.</p>`)
        server.close()
        reject(new Error(`Google retornou erro: ${error}`))
        return
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h2 style="font-family:sans-serif;color:#6BB42E">Autorizado! Pode fechar essa aba e voltar ao terminal.</h2>')
        server.close()
        resolve(code)
        return
      }

      res.writeHead(400, { 'Content-Type': 'text/html' })
      res.end('<h2>Nenhum code recebido.</h2>')
    })

    server.listen(PORT, () => {
      console.log('\nAbra esta URL no navegador para autorizar o acesso ao Google Sheets:\n')
      console.log(authUrl)
      console.log(`\nAguardando autorização em ${REDIRECT_URI} ...\n`)
    })

    server.on('error', reject)
  })
}

async function main() {
  if (!SERVICE_ROLE_KEY) {
    console.error('Erro: defina a env var SUPABASE_SERVICE_ROLE_KEY antes de rodar este script.')
    console.error('Encontre a service_role key em: Supabase Dashboard > Project Settings > API.')
    process.exit(1)
  }

  let clientId = process.env.GOOGLE_CLIENT_ID
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId) clientId = await prompt('Cole o Google OAuth Client ID (tipo Desktop app): ')
  if (!clientSecret) clientSecret = await prompt('Cole o Google OAuth Client Secret: ')

  if (!clientId || !clientSecret) {
    console.error('Client ID e Client Secret são obrigatórios.')
    process.exit(1)
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPE)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent') // força o Google a sempre devolver um refresh_token

  const code = await waitForAuthCode(authUrl.toString())

  console.log('Code recebido. Trocando por refresh_token...')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok) {
    console.error('Erro ao trocar o code por tokens:', tokenData)
    process.exit(1)
  }

  if (!tokenData.refresh_token) {
    console.error('O Google não retornou um refresh_token. Revogue o acesso em https://myaccount.google.com/permissions e rode o script novamente.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const settings: Array<{ key: string; value: string }> = [
    { key: 'google_client_id', value: clientId },
    { key: 'google_client_secret', value: clientSecret },
    { key: 'google_refresh_token', value: tokenData.refresh_token },
    { key: 'google_access_token', value: tokenData.access_token },
    { key: 'google_token_expires_at', value: String(Date.now() + (tokenData.expires_in ?? 3600) * 1000) },
  ]

  for (const { key, value } of settings) {
    const { error } = await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' })
    if (error) {
      console.error(`Erro ao salvar ${key} em app_settings:`, error.message)
      process.exit(1)
    }
  }

  console.log('\n✓ Google OAuth configurado com sucesso!')
  console.log('  google_client_id, google_client_secret e google_refresh_token salvos em app_settings.')
  console.log('  A Edge Function google-drive-sync já pode gerar access_tokens sozinha a partir de agora.')
}

main().catch((err) => {
  console.error('Falha no setup:', err)
  process.exit(1)
})
