// ============================================================
// GUADALUPE OS — Business Constants (IMMUTABLE)
// ============================================================

export const CMV_MANGO_SOUR = 3.82
export const CMV_MARGARITA_LIME = 3.93
export const CMV_PALOMA_GRAPEFRUIT = 4.02
export const CMV_AVERAGE = 3.95

export const BREAKEVEN_MONTHLY = 24000
export const FIXED_COSTS_MONTHLY = 12000
export const CASH_MINIMUM_ALERT = 8000

export const PDV_RISK_DAYS = 30
export const PDV_INACTIVE_DAYS = 60
export const LEAD_ALERT_HOURS = 24
export const REORDER_POINT_DEFAULT = 200

export const PAP_CONVERSION_RATE = 0.18
export const ADS_BUDGET_CORE = 0.70
export const ADS_BUDGET_GROWING = 0.20
export const ADS_BUDGET_TEST = 0.10

export const CMV_BY_SKU: Record<string, number> = {
  mango_sour: CMV_MANGO_SOUR,
  margarita_lime: CMV_MARGARITA_LIME,
  paloma_grapefruit: CMV_PALOMA_GRAPEFRUIT,
}

export const SKU_LABELS: Record<string, string> = {
  mango_sour: 'Mango Sour',
  margarita_lime: 'Margarita Lime',
  paloma_grapefruit: 'Paloma Grapefruit',
}

// Barris — SKU independente das latas (30L cada). Sem conversão/soma com o estoque de latas.
export const BARRIL_SKUS = ['mango_sour_barril', 'margarita_lime_barril', 'paloma_grapefruit_barril'] as const

export const BARRIL_SKU_LABELS: Record<string, string> = {
  mango_sour_barril: 'Mango Sour',
  margarita_lime_barril: 'Margarita Lime',
  paloma_grapefruit_barril: 'Paloma Grapefruit',
}

export const BARRIL_REORDER_POINT_DEFAULT = 2
export const BARRIL_VOLUME_LITERS = 30

export const CHANNEL_LABELS: Record<string, string> = {
  evento: 'Evento',
  on_trade: 'On-Trade',
  distribuidor: 'Distribuidor',
  dtc_site: 'Site DTC',
  dtc_ml: 'Mercado Livre',
  dtc_amazon: 'Amazon',
}

export const CRM_STAGE_LABELS: Record<string, string> = {
  lead_novo: 'Lead Novo',
  contato_feito: 'Contato Feito',
  qualificado: 'Qualificado',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  primeiro_pedido: 'Primeiro Pedido',
  ativo: 'Ativo',
  em_risco: 'Em Risco',
  inativo: 'Inativo',
  perdido: 'Perdido',
}

export const EVENT_STAGE_LABELS: Record<string, string> = {
  prospeccao: 'Prospecção',
  qualificado: 'Qualificado',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  pre_producao: 'Pré-Produção',
  em_execucao: 'Em Execução',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export const AFFILIATE_STATUS_LABELS: Record<string, string> = {
  mapeada: 'Mapeada',
  qualificada: 'Qualificada',
  contatada: 'Contatada',
  produto_enviado: 'Produto Enviado',
  publicou: 'Publicou',
  parceira: 'Parceira',
  inativa: 'Inativa',
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  comercial: 'Comercial',
  marketing: 'Marketing',
  eventos: 'Eventos',
  financeiro: 'Financeiro',
  vendedor: 'Vendedor',
}

export const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-rosa-vivid text-white',
  comercial: 'bg-verde-vivid text-white',
  marketing: 'bg-amarelo-vivid text-white',
  eventos: 'bg-verde-mid text-white',
  financeiro: 'bg-areia-warm text-gray-700 border border-gray-300',
  vendedor: 'bg-gray-200 text-gray-600',
}
