/**
 * GUADALUPE OS — Sync UNIDIRECIONAL: Drive → Sistema
 *
 * Direção: Planilha (Adriana edita) → Guadalupe OS (lê automaticamente)
 * A planilha NUNCA é alterada por este script. Somente leitura.
 *
 * COMO INSTALAR (uma única vez):
 * 1. Abra a planilha "Fluxo Guadalupe Atualizado"
 * 2. Extensões → Apps Script
 * 3. Apague o conteúdo existente e cole este arquivo inteiro
 * 4. Clique em Executar → "configurarTriggers"
 * 5. Aceite as permissões solicitadas pelo Google
 * Pronto. A partir daí, cada edição na planilha atualiza o sistema automaticamente.
 */

// ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────
const WEBHOOK_URL    = 'https://szcaggkwvtghgravfqrs.supabase.co/functions/v1/drive-webhook'
const WEBHOOK_SECRET = 'guadalupe-drive-2026'

// Mapa: nome da aba (exato, maiúsculas) → mês e ano
// Verifique se os nomes batem com as abas reais da sua planilha
const ABA_MES = {
  'DEZ 25':  { mes: 12, ano: 2025 },
  'JAN 26':  { mes: 1,  ano: 2026 },
  'FEV 26':  { mes: 2,  ano: 2026 },
  'MAR 26':  { mes: 3,  ano: 2026 },
  'ABR 26':  { mes: 4,  ano: 2026 },
  'MAI 26':  { mes: 5,  ano: 2026 },
  'JUN 26':  { mes: 6,  ano: 2026 },
  'JUL 26':  { mes: 7,  ano: 2026 },
  'AGO 26':  { mes: 8,  ano: 2026 },
  'SET 26':  { mes: 9,  ano: 2026 },
  'OUT 26':  { mes: 10, ano: 2026 },
  'NOV 26':  { mes: 11, ano: 2026 },
  'DEZ 26':  { mes: 12, ano: 2026 },
}

// Posição das colunas na planilha (base 1 = coluna A)
const COL_DIA     = 1  // A — número do dia
const COL_ENTRADA = 2  // B — valor entrada
const COL_SAIDA   = 3  // C — valor saída
const LINHA_INICIO = 2 // linha 1 é cabeçalho

// ─── TRIGGER PRINCIPAL: onEdit ─────────────────────────────────────────────
// Dispara automaticamente cada vez que Adriana edita uma célula.
// NÃO escreve nada na planilha — só lê e envia para o sistema.
function onEdit(e) {
  try {
    const sheet  = e.range.getSheet()
    const nomeAba = sheet.getName().toUpperCase().trim()
    const mesInfo = ABA_MES[nomeAba]

    // Ignorar abas não mapeadas (totais, resumo, etc.)
    if (!mesInfo) return

    const row = e.range.getRow()
    const col = e.range.getColumn()

    // Só reagir a edições nas colunas de Entrada ou Saída
    if (row < LINHA_INICIO) return
    if (col !== COL_ENTRADA && col !== COL_SAIDA) return

    // Ler a linha editada (sem alterar nada)
    const rowData = sheet.getRange(row, COL_DIA, 1, COL_SAIDA).getValues()[0]
    const dia     = parseInt(rowData[0])
    const entrada = _parseBRL(rowData[COL_ENTRADA - 1])
    const saida   = _parseBRL(rowData[COL_SAIDA   - 1])

    // Validações básicas
    if (!dia || isNaN(dia) || dia < 1 || dia > 31) return
    if (entrada === 0 && saida === 0) return

    const isoDate = _toISO(dia, mesInfo.mes, mesInfo.ano)

    _postWebhook({
      action:   'upsert_entry',
      date:     isoDate,
      inflows:  entrada,
      outflows: saida,
      notes:    `Drive — ${nomeAba} dia ${dia}`,
      drive_row: row,
    })

    Logger.log(`→ Sistema atualizado: ${isoDate} | E: R$${entrada} | S: R$${saida}`)

  } catch (err) {
    // Logar erro sem interromper o trabalho da Adriana
    Logger.log('ERRO onEdit: ' + err.toString())
  }
}

// ─── SYNC MANUAL: mês inteiro de uma vez ──────────────────────────────────
// Use quando quiser importar todos os lançamentos do mês ativo de uma vez.
// Útil para o primeiro sync ou para garantir que nada ficou pra trás.
// NÃO altera a planilha.
function syncMesAtual() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet()
  const sheet   = ss.getActiveSheet()
  const nomeAba = sheet.getName().toUpperCase().trim()
  const mesInfo = ABA_MES[nomeAba]

  if (!mesInfo) {
    SpreadsheetApp.getUi().alert(
      'Aba não reconhecida.\n\n' +
      'Verifique se o nome desta aba está no mapeamento ABA_MES no script.\n' +
      'Nomes esperados: DEZ 25, JAN 26, FEV 26, etc.'
    )
    return
  }

  // Ler o mês inteiro (sem modificar)
  const dados   = sheet.getRange(LINHA_INICIO, COL_DIA, 31, COL_SAIDA).getValues()
  const entries = []

  for (let i = 0; i < dados.length; i++) {
    const dia     = parseInt(dados[i][0])
    const entrada = _parseBRL(dados[i][COL_ENTRADA - 1])
    const saida   = _parseBRL(dados[i][COL_SAIDA   - 1])

    if (!dia || isNaN(dia) || dia < 1 || dia > 31) continue
    if (entrada === 0 && saida === 0) continue

    entries.push({
      date:     _toISO(dia, mesInfo.mes, mesInfo.ano),
      inflows:  entrada,
      outflows: saida,
      row:      LINHA_INICIO + i,
    })
  }

  if (entries.length === 0) {
    SpreadsheetApp.getUi().alert('Nenhum lançamento encontrado nesta aba.\nVerifique se há valores nas colunas Entrada e Saída.')
    return
  }

  const result = _postWebhook({
    action:  'sync_month',
    month:   mesInfo.mes,
    year:    mesInfo.ano,
    entries: entries,
  })

  SpreadsheetApp.getUi().alert(
    `Sync concluído — ${nomeAba}\n\n` +
    `Novos: ${result.inserted || 0}\n` +
    `Atualizados: ${result.updated || 0}\n` +
    `Ignorados: ${result.skipped || 0}\n` +
    `Total: ${entries.length} lançamentos`
  )
}

// ─── TESTE DE CONEXÃO ──────────────────────────────────────────────────────
// Rode isso primeiro para confirmar que o script consegue falar com o sistema.
function testarConexao() {
  try {
    const resp = UrlFetchApp.fetch(WEBHOOK_URL, { muteHttpExceptions: true })
    const data = JSON.parse(resp.getContentText())

    if (data.ok) {
      SpreadsheetApp.getUi().alert(
        '✅ Conexão OK!\n\n' +
        'O script está conectado ao Guadalupe OS.\n' +
        'Registros no sistema: ' + (data.registros ?? '?')
      )
    } else {
      SpreadsheetApp.getUi().alert('⚠️ Resposta inesperada:\n' + JSON.stringify(data))
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Erro de conexão:\n' + err.toString())
  }
}

// ─── CONFIGURAR TRIGGERS (rode uma única vez) ──────────────────────────────
function configurarTriggers() {
  // Remove triggers antigos para evitar duplicatas
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t))

  // Cria apenas o trigger de edição (unidirecional: planilha → sistema)
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  ScriptApp.newTrigger('onEdit').forSpreadsheet(ss).onEdit().create()

  Logger.log('✓ Trigger onEdit configurado')
  SpreadsheetApp.getUi().alert(
    '✅ Pronto!\n\n' +
    'Trigger ativado: cada edição na planilha atualiza o Guadalupe OS automaticamente.\n\n' +
    'A planilha em si nunca será alterada por este script.\n\n' +
    'Para testar: execute "testarConexao".'
  )
}

// ─── HELPERS INTERNOS ──────────────────────────────────────────────────────
function _parseBRL(val) {
  if (!val && val !== 0) return 0
  const s = String(val).replace(/[^0-9,.-]/g, '').replace(',', '.')
  return parseFloat(s) || 0
}

function _toISO(dia, mes, ano) {
  return `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
}

function _postWebhook(payload) {
  const resp = UrlFetchApp.fetch(WEBHOOK_URL, {
    method:           'POST',
    headers:          { 'Content-Type': 'application/json', 'x-webhook-secret': WEBHOOK_SECRET },
    payload:          JSON.stringify(payload),
    muteHttpExceptions: true,
  })
  try { return JSON.parse(resp.getContentText()) } catch { return {} }
}
