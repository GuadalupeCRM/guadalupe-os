// ============================================================
// agent-channel-tagger
// Called directly by bling-webhook when canal_confidence < 0.85.
// Body: { bling_id: string }
// ============================================================
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { callClaude } from '../_shared/claudeClient.ts'
import { corsHeaders, handleOptions } from '../_shared/cors.ts'

const SYSTEM_PROMPT = `Você é o agente de tagging de canais da Guadalupe. Com base nas informações da NF e no contexto da empresa, classifique o canal de venda mais provável. Responda APENAS com um JSON: { "canal": "evento|on_trade|distribuidor|dtc_site|dtc_ml|dtc_amazon", "confidence": 0.0-1.0, "reasoning": "string curta" }`

const VALID_CANAIS = ['evento', 'on_trade', 'distribuidor', 'dtc_site', 'dtc_ml', 'dtc_amazon']

Deno.serve(async (req) => {
  const opt = handleOptions(req)
  if (opt) return opt

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = getSupabaseAdmin()

  try {
    const body = await req.json()
    const blingId = body?.bling_id as string | undefined

    if (!blingId) {
      return new Response(JSON.stringify({ error: 'bling_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const [{ data: nf }, { data: pdvs }, { data: leads }] = await Promise.all([
      supabase.from('bling_nfs').select('*').eq('bling_id', blingId).single(),
      supabase.from('pdvs').select('cnpj, nome, tipo').limit(100),
      supabase.from('leads').select('cnpj, nome, empresa, canal').limit(100),
    ])

    if (!nf) {
      return new Response(JSON.stringify({ error: 'NF not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userMessage = JSON.stringify({
      nf: {
        nf_number: nf.nf_number,
        client_name: nf.cliente,
        cnpj: nf.cnpj,
        valor: nf.valor,
        description: nf.description,
        items: nf.items,
        data: nf.data,
      },
      known_pdvs: pdvs ?? [],
      known_leads: leads ?? [],
      canais_possiveis: VALID_CANAIS,
    })

    const raw = await callClaude(SYSTEM_PROMPT, userMessage, 300)

    // Parse the JSON response from Claude
    let classification: { canal: string; confidence: number; reasoning: string } | null = null
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (VALID_CANAIS.includes(parsed.canal) && typeof parsed.confidence === 'number') {
          classification = parsed
        }
      }
    } catch {
      console.error('Failed to parse Claude JSON:', raw)
    }

    if (!classification) {
      return new Response(JSON.stringify({ ok: false, error: 'could not parse classification', raw }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update the NF record
    await supabase
      .from('bling_nfs')
      .update({
        canal: classification.canal,
        canal_confidence: classification.confidence,
      })
      .eq('bling_id', blingId)

    return new Response(JSON.stringify({ ok: true, classification }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('agent-channel-tagger error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
