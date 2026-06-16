export const STAGE_ORDER = [
  'mapeada', 'qualificada', 'contatada', 'produto_enviado', 'publicou', 'parceira', 'inativa',
] as const

export const STAGE_BADGE: Record<string, string> = {
  mapeada: 'bg-gray-100 text-gray-500',
  qualificada: 'bg-blue-50 text-blue-600',
  contatada: 'bg-amarelo-pale text-yellow-700',
  produto_enviado: 'bg-purple-50 text-purple-600',
  publicou: 'bg-verde-pale text-verde-vivid',
  parceira: 'bg-verde-vivid text-white',
  inativa: 'bg-rosa-pale text-rosa-vivid',
}

export const NICHE_OPTIONS = [
  { value: 'moda', label: 'Moda' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'gastronomia', label: 'Gastronomia' },
  { value: 'esportes', label: 'Esportes' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'outro', label: 'Outro' },
]

export const NICHE_LABELS: Record<string, string> = {
  moda: 'Moda',
  lifestyle: 'Lifestyle',
  gastronomia: 'Gastronomia',
  esportes: 'Esportes',
  viagem: 'Viagem',
  outro: 'Outro',
}

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
}

export const COUPON_STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
}

export const DISCOVERY_STATUS_LABELS: Record<string, string> = {
  sugerida: 'Sugerida',
  analisada: 'Analisada',
  descartada: 'Descartada',
  adicionada: 'Adicionada',
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function generateCouponCode(name: string, sequence: number): string {
  const cleanName = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
  const firstName = cleanName.slice(0, Math.min(cleanName.length, 4)) || 'AFI'
  return `GUADALUPE${firstName}${String(sequence).padStart(3, '0')}`
}
