import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const SHEET_ID = '1SMDK5x-bWWu0_sRhgKKap7DJ1s5fujeXHV_GZPzLqqo'
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

async function syncDriveToSupabase(accessToken: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_TAB}!A1:EA50?majorDimension=COLUMNS`
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } })
  if (!resp.ok) throw new Error(`Sheets API error: ${resp.status}`)
  const data = await resp.json()
  const cols: string[][] = data.values ?? []

  const entries: any[] = []
  const diarioRows: { date: string; value: number }[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const { month, year, col } of MONTHS_2025) {
    const dayCol    = cols[col - 1] ?? []
    const entCol    = cols[col]     ?? []
    const outCol    = cols[col + 1] ?? []
    const diarioCol = cols[col + 2] ?? [] // Diário (CV) — opcional: se a coluna não existir, fica []
    const saldoCol  = cols[col + 3] ?? []

    for (let row = 2; row <= 33; row++) { // linhas 3-34 = índices 2-33
      const dayRaw = dayCol[row]
      const day = parseInt(dayRaw)
      if (!day || day < 1 || day > 31) continue

      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      if (date > today) continue

      const inflows  = parseFloat(entCol[row]   || '0') || 0
      const outflows = parseFloat(outCol[row]   || '0') || 0
      const saldo    = parseFloat(saldoCol[row] || '0') || 0
      const diario   = parseFloat(diarioCol[row] || '0') || 0

      if (inflows > 0 || outflows > 0) {
        const ob = Math.round((saldo - inflows + outflows) * 100) / 100
        entries.push({ date, opening_balance: ob, inflows, outflows, source: 'drive_2025' })
      }

      if (diario > 0) {
        diarioRows.push({ date, value: diario })
      }
    }
  }

  if (entries.length) {
    const { error } = await supabase.from('cash_flow').upsert(entries, { onConflict: 'date' })
    if (error) throw error
  }

  const diarioSynced = await syncDiarioEntries(diarioRows)

  return {
    synced: entries.length,
    last_date: entries[entries.length - 1]?.date,
    diario_synced: diarioSynced,
  }
}

// Lança a coluna Diário (CV) como saída de caixa categoria 'diario', com a mesma
// regra de deduplicação: não duplica se já existe entry com mesma date + description.
async function syncDiarioEntries(rows: { date: string; value: number }[]): Promise<number> {
  let synced = 0
  for (const { date, value } of rows) {
    const description = `Diário — ${date}`

    const { data: existing } = await supabase
      .from('cash_entries')
      .select('id')
      .eq('date', date)
      .eq('description', description)
      .maybeSingle()

    if (existing) continue

    const { error } = await supabase.from('cash_entries').insert({
      date,
      type: 'saida',
      category: 'diario',
      value,
      description,
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
    // Buscar Google OAuth token do banco
    const { data: tokenRow } = await supabase
      .from('app_settings').select('value').eq('key', 'google_oauth_token').single()

    if (!tokenRow?.value) {
      // Sem token OAuth — retorna status informativo
      return new Response(JSON.stringify({
        ok: false,
        message: 'Google OAuth não configurado. O Drive está sincronizado manualmente (257 entradas, Mai/25-Jun/26).',
        cash_flow_count: (await supabase.from('cash_flow').select('*', { count: 'exact', head: true })).count,
        last_sync: 'manual',
      }), { headers: cors })
    }

    const tokenData = JSON.parse(tokenRow.value)
    const result = await syncDriveToSupabase(tokenData.access_token)
    await supabase.from('app_settings').upsert({ key: 'last_drive_sync', value: new Date().toISOString() })

    return new Response(JSON.stringify({ ok: true, ...result }), { headers: cors })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e.message) }), { status: 500, headers: cors })
  }
})
