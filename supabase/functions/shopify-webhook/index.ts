import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

async function verifyShopifyHmac(secret: string, rawBody: string, hmacHeader: string | null): Promise<boolean> {
  if (!secret) return true
  if (!hmacHeader) return false

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = btoa(String.fromCharCode(...new Uint8Array(mac)))

  if (computed.length !== hmacHeader.length) return false
  let mismatch = 0
  for (let i = 0; i < computed.length; i++) if (computed[i] !== hmacHeader[i]) mismatch++
  return mismatch === 0
}

function mondayOf(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabase = getSupabaseAdmin()
  const rawBody = await req.text()
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256')

  try {
    const secret = await getAppSetting(supabase, 'shopify_webhook_secret')
    const valid = await verifyShopifyHmac(secret ?? '', rawBody, hmacHeader)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'invalid hmac signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const order = JSON.parse(rawBody)
    const orderId = String(order.id ?? order.order_number ?? '')
    const totalPrice = Number(order.total_price ?? order.current_total_price ?? 0)
    const lineItems = order.line_items ?? []
    const totalUnits = lineItems.reduce((sum: number, li: any) => sum + Number(li.quantity ?? 0), 0)

    const discountCodes: string[] = (order.discount_codes ?? []).map((d: any) => String(d.code ?? '').toUpperCase())

    let matchedAffiliate = null
    let matchedCoupon: string | null = null

    for (const code of discountCodes) {
      const { data: affiliate } = await supabase.from('affiliates').select('*').eq('coupon_code', code).maybeSingle()
      if (affiliate) {
        matchedAffiliate = affiliate
        matchedCoupon = code
        break
      }
    }

    if (matchedAffiliate) {
      const { error: convError } = await supabase.from('affiliate_conversions').insert({
        affiliate_id: matchedAffiliate.id,
        shopify_order_id: orderId,
        order_value: totalPrice,
        units_sold: totalUnits,
        coupon_code: matchedCoupon,
      })

      if (convError && !String(convError.message ?? '').includes('duplicate')) throw convError

      if (!convError) {
        const newTotalSales = Number(matchedAffiliate.total_sales_generated ?? 0) + totalPrice
        const newTotalUnits = Number(matchedAffiliate.total_units_generated ?? 0) + totalUnits
        const newTotalUses = Number(matchedAffiliate.total_uses ?? 0) + 1
        const investment = Number(matchedAffiliate.investment ?? 0)
        const newRoi = investment > 0 ? ((newTotalSales - investment) / investment) * 100 : null

        await supabase.from('affiliates').update({
          total_sales_generated: newTotalSales,
          total_units_generated: newTotalUnits,
          total_uses: newTotalUses,
          roi: newRoi,
          updated_at: new Date().toISOString(),
        }).eq('id', matchedAffiliate.id)
      }

      return new Response(JSON.stringify({ ok: true, matched_affiliate: matchedAffiliate.name, coupon_code: matchedCoupon }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const weekStart = mondayOf(new Date())
    const { data: existingRevenue } = await supabase.from('channel_revenue').select('*').eq('week_start', weekStart).eq('canal', 'dtc_site').maybeSingle()

    if (existingRevenue) {
      await supabase.from('channel_revenue').update({
        revenue: Number(existingRevenue.revenue ?? 0) + totalPrice,
        units_sold: Number(existingRevenue.units_sold ?? 0) + totalUnits,
      }).eq('id', existingRevenue.id)
    } else {
      await supabase.from('channel_revenue').insert({
        week_start: weekStart,
        canal: 'dtc_site',
        revenue: totalPrice,
        units_sold: totalUnits,
      })
    }

    return new Response(JSON.stringify({ ok: true, matched_affiliate: null, channel: 'dtc_site' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('shopify-webhook error', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
