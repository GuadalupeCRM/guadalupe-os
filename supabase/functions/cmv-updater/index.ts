// ============================================================
// cmv-updater
//
// Called (directly, or from bling-webhook/bling-sync) when an
// inbound NF contains items that may affect the CMV cost
// components of one or more SKUs.
//
// Body shape:
//   {
//     "items": [{ "descricao": "Tequila Prata 1L", "quantidade": 12, "valor": 38.5 }, ...],
//     "nf": {
//       "bling_id": "123", "nf_number": "456", "client_name": "Distribuidora X",
//       "total_value": 1200, "issued_at": "2026-06-10", "tipo": "entrada", ...
//     }
//   }
//
// Matches items to SKU cost components by keyword, computes the
// new unit-cost impact, and creates an `agent_insight` for review.
// It NEVER writes to cmv_components/cmv_history directly — Adriana
// (financeiro) must approve the change from the CMV tab.
// ============================================================
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { suggestCMVUpdate } from '../_shared/classify.ts'
import type { BlingNFItem, BlingNFNormalized } from '../_shared/blingClient.ts'

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const items = (body?.items ?? []) as BlingNFItem[]
    const nfInput = body?.nf ?? {}

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'items[] is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const nf: BlingNFNormalized = {
      bling_id: String(nfInput.bling_id ?? ''),
      nf_number: String(nfInput.nf_number ?? ''),
      client_cnpj: nfInput.client_cnpj ?? null,
      client_name: nfInput.client_name ?? 'Desconhecido',
      total_value: Number(nfInput.total_value ?? 0),
      issued_at: nfInput.issued_at ?? new Date().toISOString().slice(0, 10),
      status: nfInput.status ?? 'desconhecido',
      tipo: nfInput.tipo ?? 'entrada',
      description: nfInput.description ?? '',
      items,
    }

    const supabase = getSupabaseAdmin()
    await suggestCMVUpdate(supabase, items, nf)

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('cmv-updater error', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
