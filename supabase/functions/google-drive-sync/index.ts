import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Sheet ID padrão — pode ser sobrescrito via app_settings (key='google_spreadsheet_id')
const DEFAULT_SHEET_ID = '1SMDK5x-bWWu0_sRhgKKap7DJ1s5fujeXHV_GZPzLqqo'
const SHEET_TAB = '2025'

// Mapeamento de colunas da aba 2025
// Cada mês tem 6 colunas (2025) ou 5 colunas (2026)
// Linha 1 = nome mês, Linha 2 = header, Linhas 3-34 = dias
// Layout dentro do bloco do mês: col-1 = Dia | col = Entrada (CT) | col+1 = Saída (CU)
// | col+2 = Diário (CV) | col+3 = Saldo
const MONTHS_2025 = [
  { month: 5, year: 2025, col: 25 },  // MAIO
  { month: 6, year: 2025, col: 31 },  // JUNHO
  { month: 7, year: 2025, col: 37 },  // JULHO
  { month: 8, year: 2025, col: 43 },  // AGOSTO
  { month: 9, year: 2025, col: 49 },  // SETEMBRO
  { month: 10, year: 2025, col: 55 }, // OUTUBRO
  { month: 11, year: 2025, col: 61 }, // NOVEMBRO
  { month: 12, year: 2025, col: 67 }, // DEZEMBRO
  { month: 1, year: 2026, col: 72 },  // JANEIRO
  { month: 2, year: 2026, col: 77 },  // FEVEREIRO
  { month: 3, year: 2026, col: 82 },  // MARÇO
  { month: 4, year: 2026, col: 87 },  // ABRIL
  { month: 5, year: 2026, col: 92 },  // MAIO
  { month: 6, year: 2026, col: 97 },  // JUNHO (CW=101=saldo)
]

async function getAppSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle()
  if (!data?.value) return null
  return typeof data.value === 'string' ? data.value : String(data.value)
}

// Troca o refresh_token por um access_token novo (eles expiram em ~1h, o refresh_token não expira).
async function getAccessTokenFromRefreshToken(): Promise<string> {
  const [refreshToken, clientId, clientSecret] = await Promise.all([
    getAppSetting('google_refresh_token'),
    getAppSetting('google_client_id'),
    getAppSetting('google_client_secret'),
  ])

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('NOT_CONFIGURED')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`)
  return data.access_token as string
}

interface DiaryRow {
  date: string
  type: 'entrada' | 'saida'
  category: string
  value: number
  description: string
}

async function syncDriveToSupabase(accessToken: string) {
  const spreadsheetId = (await getAppSetting('google_spreadsheet_id')) ?? DEFAULT_SHEET_ID
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_TAB}!A1:EA50?majorDimension=COLUMNS`
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } })
  if (!resp.ok) throw new Error(`Sheets API error: ${resp.status}`)
  const data = await resp.json()
  const cols: string[][] = data.values ?? []

  const rows: DiaryRow[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const { month, year, col } of MONTHS_2025) {
    const dayCol    = cols[col - 1] ?? []
    const entCol    = cols[col]     ?? [] // Entrada (CT)
    const outCol    = cols[col + 1] ?? [] // Saída (CU)
    const diarioCol = cols[col + 2] ?? [] // Diário (CV) — opcional: se a coluna não existir, fica []

    for (let row = 2; row <= 33; row++) { // linhas 3-34 = índices 2-33
      const dayRaw = dayCol[row]
      const day = parseInt(dayRaw)
      if (!day || day < 1 || day > 31) continue

      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (date > today) continue

      const inflows  = parseFloat(entCol[row]    || '0') || 0
      const outflows = parseFloat(outCol[row]    || '0') || 0
      const diario   = parseFloat(diarioCol[row] || '0') || 0

      if (inflows > 0) {
        rows.push({ date, type: 'entrada', category: 'vendas', value: inflows, description: `Entrada — ${date}` })
      }
      if (outflows > 0) {
        rows.push({ date, type: 'saida', category: 'custos', value: outflows, description: `Saída — ${date}` })
      }
      if (diario > 0) {
        rows.push({ date, type: 'saida', category: 'diario', value: diario, description: `Diário — ${date}` })
      }
    }
  }

  const synced = await syncCashEntries(rows)
  return { synced, total_rows: rows.length, last_date: rows[rows.length - 1]?.date }
}

// Insere em cash_entries; não duplica se já existe entry com mesma date + description.
async function syncCashEntries(rows: DiaryRow[]): Promise<number> {
  let synced = 0
  for (const row of rows) {
    const { data: existing } = await supabase
      .from('cash_entries')
      .select('id')
      .eq('date', row.date)
      .eq('description', row.description)
      .maybeSingle()

    if (existing) continue

    const { error } = await supabase.from('cash_entries').insert({
      date: row.date,
      type: row.type,
      category: row.category,
      value: row.value,
      description: row.description,
    })
    if (error) throw error
    synced++
  }
  return synced
}

Deno.serve(async (req: Request) => {
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const accessToken = await getAccessTokenFromRefreshToken()
    const result = await syncDriveToSupabase(accessToken)
    await supabase.from('app_settings').upsert({ key: 'last_drive_sync', value: new Date().toISOString() }, { onConflict: 'key' })

    return new Response(JSON.stringify({ ok: true, ...result }), { headers: cors })
  } catch (e: any) {
    if (e.message === 'NOT_CONFIGURED') {
      return new Response(JSON.stringify({
        ok: false,
        message: 'Google OAuth não configurado (google_refresh_token / google_client_id / google_client_secret faltando em app_settings). Rode scripts/setup-google-oauth.ts para configurar.',
      }), { headers: cors })
    }
    return new Response(JSON.stringify({ error: String(e.message) }), { status: 500, headers: cors })
  }
})
