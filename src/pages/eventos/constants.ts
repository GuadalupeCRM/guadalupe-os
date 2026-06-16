import type { EventStage } from '../../types'

export const PIPELINE_STAGE_ORDER: EventStage[] = [
  'prospeccao', 'qualificado', 'proposta_enviada', 'negociacao', 'fechado',
]

export const STAGE_BADGE: Record<string, string> = {
  prospeccao: 'bg-gray-100 text-gray-500',
  qualificado: 'bg-amarelo-pale text-yellow-700',
  proposta_enviada: 'bg-amarelo-mid text-yellow-800',
  negociacao: 'bg-amarelo-vivid text-white',
  fechado: 'bg-verde-pale text-verde-vivid',
  pre_producao: 'bg-blue-50 text-blue-600',
  em_execucao: 'bg-rosa-vivid text-white',
  finalizado: 'bg-verde-vivid text-white',
  cancelado: 'bg-gray-100 text-gray-400',
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  balada: 'Balada',
  festival: 'Festival',
  corporativo: 'Corporativo',
  gastro: 'Gastronômico',
  proprio: 'Próprio',
  outro: 'Outro',
}

export const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS)

export const DEFAULT_CHECKLIST: { label: string; done: boolean }[] = [
  'Confirmar data com venue',
  'Definir quantidade de produto',
  'Organizar transporte',
  'Escalar equipe',
  'Levar material de divulgação',
  'Montar chopeira/display',
  'Registrar vendas durante evento',
  'Fotos e vídeos para IG',
  'Registrar UGCs',
  'Emitir NF',
].map((label) => ({ label, done: false }))

export const PAYMENT_METHODS = ['Dinheiro', 'PIX', 'Crédito', 'Débito']

export function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}
