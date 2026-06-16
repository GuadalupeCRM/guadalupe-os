import type { AdBudgetTier, AdCampaignStatus } from '../../types'

export const ADS_ROAS_TARGET = 3

export const TIER_LABELS: Record<AdBudgetTier, string> = {
  core: 'CORE',
  growing: 'GROWING',
  test: 'TEST',
}

export const TIER_PCT: Record<AdBudgetTier, number> = {
  core: 70,
  growing: 20,
  test: 10,
}

export const TIER_DESCRIPTIONS: Record<AdBudgetTier, string> = {
  core: 'Campanhas comprovadas, alto ROAS, conversão',
  growing: 'Campanhas em escala, testando novos públicos',
  test: 'Novos criativos, públicos e formatos em validação',
}

export const TIER_ORDER: AdBudgetTier[] = ['core', 'growing', 'test']

export const CAMPAIGN_STATUS_LABELS: Record<AdCampaignStatus, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
  em_analise: 'Em Análise',
}

export const CAMPAIGN_STATUS_BADGE: Record<AdCampaignStatus, string> = {
  ativa: 'bg-verde-pale text-verde-vivid',
  pausada: 'bg-amarelo-pale text-yellow-700',
  encerrada: 'bg-gray-100 text-gray-500',
  em_analise: 'bg-amarelo-vivid text-white',
}

export const PLATFORM_OPTIONS = ['Meta', 'Google', 'TikTok', 'Pinterest']

export const CANAL_OPTIONS = [
  { value: 'dtc_site', label: 'Site DTC' },
  { value: 'dtc_ml', label: 'Mercado Livre' },
  { value: 'dtc_amazon', label: 'Amazon' },
  { value: 'evento', label: 'Evento' },
  { value: 'on_trade', label: 'On-Trade' },
  { value: 'distribuidor', label: 'Distribuidor' },
]

export function spendColor(pctConsumed: number): string {
  if (pctConsumed > 90) return 'rosa'
  if (pctConsumed >= 70) return 'amarelo'
  return 'verde'
}

export function spendColorClasses(pctConsumed: number): { bar: string; text: string } {
  const c = spendColor(pctConsumed)
  if (c === 'rosa') return { bar: 'bg-rosa-vivid', text: 'text-rosa-vivid' }
  if (c === 'amarelo') return { bar: 'bg-amarelo-vivid', text: 'text-amarelo-vivid' }
  return { bar: 'bg-verde-vivid', text: 'text-verde-vivid' }
}

export function healthScoreColor(score: number): string {
  if (score >= 75) return 'text-verde-vivid'
  if (score >= 50) return 'text-amarelo-vivid'
  return 'text-rosa-vivid'
}
