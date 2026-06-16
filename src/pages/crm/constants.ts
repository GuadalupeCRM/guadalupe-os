export const CANAL_BADGE: Record<string, string> = {
  evento: 'bg-amarelo-pale text-yellow-700',
  on_trade: 'bg-verde-pale text-verde-vivid',
  distribuidor: 'bg-blue-50 text-blue-600',
  dtc_site: 'bg-rosa-pale text-rosa-vivid',
  dtc_ml: 'bg-purple-50 text-purple-600',
  dtc_amazon: 'bg-orange-50 text-orange-600',
}

export const STAGE_ORDER = [
  'lead_novo', 'contato_feito', 'qualificado', 'proposta_enviada',
  'negociacao', 'primeiro_pedido', 'ativo', 'em_risco', 'inativo', 'perdido',
] as const

export const STAGE_BADGE: Record<string, string> = {
  lead_novo: 'bg-gray-100 text-gray-500',
  contato_feito: 'bg-amarelo-pale text-yellow-700',
  qualificado: 'bg-blue-50 text-blue-600',
  proposta_enviada: 'bg-amarelo-pale text-yellow-700',
  negociacao: 'bg-purple-50 text-purple-600',
  primeiro_pedido: 'bg-verde-vivid text-white',
  ativo: 'bg-verde-pale text-verde-vivid',
  em_risco: 'bg-rosa-pale text-rosa-vivid',
  inativo: 'bg-gray-100 text-gray-400',
  perdido: 'bg-rosa-pale text-rosa-vivid',
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  ligacao: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  visita: 'Visita',
  reuniao: 'Reunião',
  proposta_enviada: 'Proposta Enviada',
  pedido: 'Pedido',
  outro: 'Outro',
}

export const ORIGIN_OPTIONS = [
  'Indicação', 'Instagram', 'Prospecção Ativa', 'Site', 'WhatsApp', 'Evento',
]

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}
