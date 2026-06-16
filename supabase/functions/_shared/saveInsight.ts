import { getSupabaseAdmin } from './supabaseAdmin.ts'

export async function saveInsight(
  agentName: string,
  insightType: string,
  title: string,
  message: string,
  actionLabel?: string,
  actionUrl?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('agent_insights').insert({
    agent_name: agentName,
    insight_type: insightType,
    title,
    message,
    ...(actionLabel ? { action_label: actionLabel } : {}),
    ...(actionUrl ? { action_url: actionUrl } : {}),
    ...(metadata ? { metadata } : {}),
  })
  if (error) {
    console.error(`saveInsight error (${agentName}):`, error)
  }
}
