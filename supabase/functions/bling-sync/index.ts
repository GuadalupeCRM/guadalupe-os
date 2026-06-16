// ============================================================
// bling-sync
//
// Manual sync trigger — also intended to run on a daily cron
// at 06:00 BRT (09:00 UTC). Schedule via:
//   select cron.schedule('bling-daily-sync', '0 9 * * *',
//     $$ select net.http_post(
//          url := 'https://szcaggkwvtghgravfqrs.supabase.co/functions/v1/bling-sync',
//          headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
//        ) $$);
//
// Fetches NFs issued in the last 7 days, inserts new ones with
// canal classification, and re-attempts classification for any
// previously-stored NF still missing a canal.
// ============================================================
import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { fetchBlingNFs, fetchBlingNFDetails, normalizeBlingNF } from '../_shared/blingClient.ts'
import { classifyCanal, createUnclassifiedInsight, suggestCMVUpdate, updateInventoryFromNF } from '../_shared/classify.ts'

const CONFIDENCE_THRESHOLD = 0.85

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req)
  if (optionsResponse) return optionsResponse

  const supabase = getSupabaseAdmin()

  let synced = 0
  let classified = 0
  let needsReview = 0

  try {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    // 1. Fetch NFs from the last 7 days (paginated)
    let pagina = 1
    let nfsRaw: unknown[] = []
    while (true) {
      const page = await fetchBlingNFs({
        dataEmissaoInicial: isoDate(sevenDaysAgo),
        dataEmissaoFinal: isoDate(today),
        pagina,
      })
      if (page.length === 0) break
      nfsRaw = nfsRaw.concat(page)
      if (page.length < 100) break // last page (Bling default page size)
      pagina++
    }

    for (const raw of nfsRaw) {
      const summary = normalizeBlingNF(raw)

      const { data: existing } = await supabase
        .from('bling_nfs')
        .select('bling_id, canal')
        .eq('bling_id', summary.bling_id)
        .maybeSingle()

      if (!existing) {
        // Fetch full details (items) before inserting
        let detailed = summary
        try {
          const details = await fetchBlingNFDetails(summary.bling_id)
          detailed = normalizeBlingNF(details)
        } catch (err) {
          console.error(`failed to fetch details for NF ${summary.bling_id}`, err)
        }

        const { error: insertError } = await supabase.from('bling_nfs').insert({
          bling_id: detailed.bling_id,
          nf_number: detailed.nf_number,
          cliente: detailed.client_name,
          cnpj: detailed.client_cnpj,
          valor: detailed.total_value,
          data: detailed.issued_at,
          status: detailed.status,
          tipo: detailed.tipo,
          description: detailed.description,
          items: detailed.items,
          raw_data: raw,
          synced_at: new Date().toISOString(),
        })
        if (insertError) {
          console.error('insert error', insertError)
          continue
        }
        synced++

        const classification = await classifyCanal(supabase, detailed.client_cnpj, detailed.items, detailed.description)
        await supabase
          .from('bling_nfs')
          .update({ canal: classification.canal, canal_confidence: classification.confidence })
          .eq('bling_id', detailed.bling_id)

        if (classification.canal) classified++
        if (classification.confidence < CONFIDENCE_THRESHOLD) {
          await createUnclassifiedInsight(supabase, detailed, classification)
          needsReview++
        }

        if (detailed.tipo === 'entrada' && detailed.items.length > 0) {
          await suggestCMVUpdate(supabase, detailed.items, detailed)
        }
        if (detailed.items.length > 0) {
          await updateInventoryFromNF(supabase, detailed)
        }
      } else if (!existing.canal) {
        // Re-attempt classification for NFs missing a canal
        const { data: stored } = await supabase
          .from('bling_nfs')
          .select('*')
          .eq('bling_id', summary.bling_id)
          .single()

        const items = (stored?.items ?? []) as any[]
        const classification = await classifyCanal(supabase, stored?.cnpj ?? null, items, stored?.description ?? '')

        await supabase
          .from('bling_nfs')
          .update({ canal: classification.canal, canal_confidence: classification.confidence })
          .eq('bling_id', summary.bling_id)

        if (classification.canal) classified++
        if (classification.confidence < CONFIDENCE_THRESHOLD) {
          needsReview++
        }
      }
    }

    return new Response(JSON.stringify({ synced, classified, needsReview }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('bling-sync error', err)
    return new Response(JSON.stringify({ error: String(err), synced, classified, needsReview }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
