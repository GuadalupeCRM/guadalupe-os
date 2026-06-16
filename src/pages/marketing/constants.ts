// ============================================================
// MARKETING — Constantes do módulo
// ============================================================

// Meta semanal de conteúdo Instagram
export const WEEKLY_CONTENT_GOAL = {
  posts: 3,
  reels: 2,
  stories: 5,
}

// Opções de métricas para "Criar meta"
export const GOAL_METRIC_OPTIONS = [
  { value: 'ig_followers', label: 'Seguidores Instagram' },
  { value: 'ig_engagement', label: 'Engajamento (%)' },
  { value: 'ig_posts', label: 'Posts publicados' },
  { value: 'ig_reach', label: 'Alcance médio semanal' },
  { value: 'seo_clicks', label: 'Cliques orgânicos (SEO)' },
  { value: 'email_subscribers', label: 'Novos inscritos email' },
  { value: 'email_open_rate', label: 'Taxa de abertura email (%)' },
]

export const GOAL_METRIC_LABELS: Record<string, string> = Object.fromEntries(
  GOAL_METRIC_OPTIONS.map((o) => [o.value, o.label])
)

// Email marketing
export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  pos_compra: 'Pós-compra',
  reativacao: 'Reativação',
  boas_vindas: 'Boas-vindas',
}

export const TRIGGER_TYPE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'pos_compra', label: 'Automação — Pós-compra' },
  { value: 'reativacao', label: 'Automação — Reativação' },
  { value: 'boas_vindas', label: 'Automação — Boas-vindas' },
]

export const SEGMENT_LABELS: Record<string, string> = {
  todos: 'Todos os inscritos',
  eventos: 'Participantes de eventos',
  inativos: 'Inativos',
}

export const SEGMENT_OPTIONS = [
  { value: 'todos', label: 'Todos os inscritos' },
  { value: 'eventos', label: 'Participantes de eventos' },
  { value: 'inativos', label: 'Inativos' },
]

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  agendada: 'Agendada',
  enviada: 'Enviada',
}

export const IG_POST_TYPE_LABELS: Record<string, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
}
