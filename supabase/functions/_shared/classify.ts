// ============================================================
// Canal classification, CMV impact suggestion and inventory
// updates derived from a normalized Bling NF.
// ============================================================
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { BlingNFItem, BlingNFNormalized } from './blingClient.ts'

const DTC_ML_CNPJ = '33200056000196'
const DTC_AMAZON_CNPJ = '15436940000103'

const EVENT_KEYWORDS = ['evento', 'degustação', 'degustacao', 'festival']

export interface ClassificationResult {
  canal: string | null
  confidence: number
}

// ------------------------------------------------------------
// classifyCanal
// ------------------------------------------------------------
export async function classifyCanal(
  supabase: SupabaseClient,
  cnpj: string | null,
  _items: BlingNFItem[],
  description: string,
): Promise<ClassificationResult> {
  if (cnpj === DTC_ML_CNPJ) {
    return { canal: 'dtc_ml', confidence: 0.99 }
  }

  if (cnpj === DTC_AMAZON_CNPJ) {
    return { canal: 'dtc_amazon', confidence: 0.99 }
  }

  if (cnpj) {
    const { data: pdv } = await supabase
      .from('pdvs')
      .select('id')
      .eq('cnpj', cnpj)
      .maybeSingle()
    if (pdv) {
      return { canal: 'on_trade', confidence: 0.95 }
    }
  }

  const lowerDescription = (description ?? '').toLowerCase()
  if (EVENT_KEYWORDS.some((kw) => lowerDescription.includes(kw))) {
    return { canal: 'evento', confidence: 0.85 }
  }

  if (cnpj) {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, canal')
      .eq('cnpj', cnpj)
      .eq('canal', 'distribuidor')
      .maybeSingle()
    if (lead) {
      return { canal: 'distribuidor', confidence: 0.90 }
    }
  }

  // CNPJ has 14 digits; CPF has 11 — treat non-CNPJ documents as individual consumers.
  if (cnpj && cnpj.length !== 14) {
    return { canal: 'dtc_site', confidence: 0.70 }
  }

  return { canal: null, confidence: 0 }
}

// ------------------------------------------------------------
// createUnclassifiedInsight — when confidence is too low to trust
// ------------------------------------------------------------
export async function createUnclassifiedInsight(
  supabase: SupabaseClient,
  nf: BlingNFNormalized,
  classification: ClassificationResult,
): Promise<void> {
  const suggestion = classification.canal
    ? `Sugestão automática: ${classification.canal} (confiança ${(classification.confidence * 100).toFixed(0)}%)`
    : 'Nenhuma sugestão automática disponível.'

  await supabase.from('agent_insights').insert({
    agent_name: 'bling-integration',
    insight_type: 'alerta',
    title: 'NF sem canal identificado',
    message: `A NF ${nf.nf_number} de ${nf.client_name} (CNPJ/CPF: ${nf.client_cnpj ?? 'não informado'}, valor R$ ${nf.total_value.toFixed(2)}) não pôde ser classificada com confiança suficiente. ${suggestion}`,
    action_label: 'Classificar manualmente',
  })
}

// ------------------------------------------------------------
// suggestCMVUpdate — inbound purchase NFs may shift component costs
// ------------------------------------------------------------
const SKU_LIST = ['mango_sour', 'margarita_lime', 'paloma_grapefruit'] as const
type SKU = typeof SKU_LIST[number]

interface ComponentMatch {
  componentLabel: string
  skus: SKU[]
}

const COMPONENT_KEYWORDS: { keywords: string[]; match: ComponentMatch }[] = [
  { keywords: ['tequila'], match: { componentLabel: 'Tequila', skus: ['mango_sour', 'margarita_lime', 'paloma_grapefruit'] } },
  { keywords: ['lata', 'aluminio', 'alumínio'], match: { componentLabel: 'Lata', skus: ['mango_sour', 'margarita_lime', 'paloma_grapefruit'] } },
  { keywords: ['gas carbonico', 'gás carbônico', 'gas', 'co2'], match: { componentLabel: 'Gás', skus: ['mango_sour', 'margarita_lime', 'paloma_grapefruit'] } },
  { keywords: ['rotulo mango', 'rótulo mango'], match: { componentLabel: 'Rótulo', skus: ['mango_sour'] } },
  { keywords: ['rotulo margarita', 'rótulo margarita'], match: { componentLabel: 'Rótulo', skus: ['margarita_lime'] } },
  { keywords: ['rotulo paloma', 'rótulo paloma'], match: { componentLabel: 'Rótulo', skus: ['paloma_grapefruit'] } },
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export async function suggestCMVUpdate(
  supabase: SupabaseClient,
  items: BlingNFItem[],
  nf: BlingNFNormalized,
): Promise<void> {
  for (const item of items) {
    const descNormalized = normalize(item.descricao)
    for (const { keywords, match } of COMPONENT_KEYWORDS) {
      const hit = keywords.some((kw) => descNormalized.includes(normalize(kw)))
      if (!hit) continue

      for (const sku of match.skus) {
        const { data: component } = await supabase
          .from('cmv_components')
          .select('*')
          .eq('sku', sku)
          .ilike('label', match.componentLabel)
          .maybeSingle()
        if (!component) continue

        const oldComponentValue = Number(component.value)
        const newComponentValue = Number(item.valor)
        if (!newComponentValue || newComponentValue === oldComponentValue) continue

        const { data: allComponents } = await supabase
          .from('cmv_components')
          .select('value')
          .eq('sku', sku)
        const oldCmv = (allComponents ?? []).reduce((sum: number, c: { value: number | string }) => sum + Number(c.value), 0)
        const newCmv = oldCmv - oldComponentValue + newComponentValue
        const pctChange = oldCmv > 0 ? ((newCmv - oldCmv) / oldCmv) * 100 : 0

        await supabase.from('agent_insights').insert({
          agent_name: 'bling-integration',
          insight_type: 'sugestao',
          title: 'Possível impacto no CMV identificado',
          message: `NF ${nf.nf_number} (${nf.client_name}) traz "${item.descricao}" a R$ ${newComponentValue.toFixed(2)}, alterando o componente "${match.componentLabel}" do SKU ${sku} de R$ ${oldComponentValue.toFixed(2)} para R$ ${newComponentValue.toFixed(2)}. CMV atual: R$ ${oldCmv.toFixed(2)} → novo CMV sugerido: R$ ${newCmv.toFixed(2)} (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%). Revisar e aprovar na aba CMV.`,
          action_label: 'Aprovar atualização',
          action_url: '/estoque?tab=cmv',
        })
      }
    }
  }
}

// ------------------------------------------------------------
// updateInventoryFromNF — register stock movements for finished goods
// ------------------------------------------------------------
const SKU_PRODUCT_KEYWORDS: { keywords: string[]; sku: SKU }[] = [
  { keywords: ['mango sour', 'mango'], sku: 'mango_sour' },
  { keywords: ['margarita lime', 'margarita'], sku: 'margarita_lime' },
  { keywords: ['paloma grapefruit', 'paloma'], sku: 'paloma_grapefruit' },
]

export async function updateInventoryFromNF(
  supabase: SupabaseClient,
  nf: BlingNFNormalized,
): Promise<void> {
  const movementType = nf.tipo === 'entrada' ? 'entrada' : 'saida'

  for (const item of nf.items) {
    const descNormalized = normalize(item.descricao)
    const match = SKU_PRODUCT_KEYWORDS.find(({ keywords }) =>
      keywords.some((kw) => descNormalized.includes(normalize(kw)))
    )
    if (!match || !item.quantidade) continue

    await supabase.from('inventory_movements').insert({
      date: nf.issued_at,
      sku: match.sku,
      type: movementType,
      units: Math.round(item.quantidade),
      notes: `NF ${nf.nf_number} (Bling)`,
      bling_nf_id: nf.bling_id,
    })
  }
}
