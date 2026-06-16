// ============================================================
// bling-webhook
//
// Receives NF (nota fiscal) events pushed by Bling v3.
//
// Webhook URL to register in Bling:
//   https://szcaggkwvtghgravfqrs.supabase.co/functions/v1/bling-webhook
//
// Bling signs the payload with HMAC-SHA256 using BLING_WEBHOOK_SECRET.
// The signature is sent in the `x-bling-signature-256` header as
// `sha256=<hex digest>`.
// ============================================================
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { normalizeBlingNF } from '../_shared/blingClient.ts'
import { classifyCanal, createUnclassifiedInsight, suggestCMVUpdate, updateInventoryFromNF } from '../_shared/classify.ts'

const BLING_WEBHOOK_SECRET = Deno.env.get('BLING_WEBHOOK_SECRET') ?? ''
const CONFIDENCE_THRESHOLD = 0.85

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!BLING_WEBHOOK_SECRET) return true // allow unsigned requests in dev if secret not configured
  if (!signatureHeader) return false

  const signature = signatureHeader.replace(/^sha256=/, '')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(BLING_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('')

  if (expected.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== signature[i]) mismatch++
  }
  return mismatch === 0
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-bling-signature-256')

  const valid = await verifySignature(rawBody, signature)
  if (!valid) {
    return new Response(JSON.stringify({ error: 'invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = getSupabaseAdmin()

  try {
    const nfRaw = payload?.data ?? payload?.dados ?? payload
    const nf = normalizeBlingNF(nfRaw)

    // 1. Upsert the NF
    const { error: upsertError } = await supabase.from('bling_nfs').upsert({
      bling_id: nf.bling_id,
      nf_number: nf.nf_number,
      cliente: nf.client_name,
      cnpj: nf.client_cnpj,
      valor: nf.total_value,
      data: nf.issued_at,
      status: nf.status,
      tipo: nf.tipo,
      description: nf.description,
      items: nf.items,
      raw_data: nfRaw,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'bling_id' })

    if (upsertError) throw upsertError

    // 2. Classify canal
    const classification = await classifyCanal(supabase, nf.client_cnpj, nf.items, nf.description)

    await supabase
      .from('bling_nfs')
      .update({ canal: classification.canal, canal_confidence: classification.confidence })
      .eq('bling_id', nf.bling_id)

    if (classification.confidence < CONFIDENCE_THRESHOLD) {
      await createUnclassifiedInsight(supabase, nf, classification)
    }

    // 3. Inbound purchase NFs may shift CMV components
    if (nf.tipo === 'entrada' && nf.items.length > 0) {
      await suggestCMVUpdate(supabase, nf.items, nf)
    }

    // 4. Register stock movements for recognizable finished-good items
    if (nf.items.length > 0) {
      await updateInventoryFromNF(supabase, nf)
    }

    return new Response(JSON.stringify({ ok: true, bling_id: nf.bling_id, canal: classification.canal }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('bling-webhook error', err)
    // Still return 200 so Bling does not retry indefinitely on data errors we've logged.
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
