import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, Sliders, Zap, Layers, Bell, CheckCircle, XCircle, Copy, Plus, Lock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../../components/ui/Modal'
import {
  useProfiles, useInviteUser, useUpdateUserRole, useDeactivateUser,
  useBusinessConstants, useUpdateBusinessConstant,
  useInventorySettings, useUpdateReorderPointConfig,
  useCMVComponentsConfig, useUpdateCMVComponentConfig,
  useIntegrationsStatus, useLastBlingWebhook,
  useChannelSettings, useUpdateChannelSetting,
  useNotificationSettings, useUpdateNotificationSetting,
} from '../../hooks/useConfiguracoes'
import { SKU_LABELS, CHANNEL_LABELS } from '../../constants/business'
import { formatCurrency, formatDate } from '../../utils/formatters'
import type { UserRole } from '../../types'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'vendedor', label: 'Vendedor' },
]

const TABS = [
  { key: 'usuarios', label: 'Usuários', icon: Users },
  { key: 'constantes', label: 'Constantes', icon: Sliders },
  { key: 'integracoes', label: 'Integrações', icon: Zap },
  { key: 'canais', label: 'Canais', icon: Layers },
  { key: 'notificacoes', label: 'Notificações', icon: Bell },
] as const

type TabKey = typeof TABS[number]['key']

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://szcaggkwvtghgravfqrs.supabase.co'

// ============================================================
// TAB 1 — USUÁRIOS
// ============================================================
function InviteUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('vendedor')
  const invite = useInviteUser()

  const handleSubmit = async () => {
    if (!email || !fullName) { toast.error('Preencha nome e email'); return }
    try {
      await invite.mutateAsync({ email, full_name: fullName, role })
      toast.success('Usuário convidado — link de definição de senha enviado por email')
      setEmail(''); setFullName(''); setRole('vendedor')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar usuário')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Convidar usuário">
      <div className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Nome completo</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Papel</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={invite.isPending} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid disabled:opacity-50">
            {invite.isPending ? 'Convidando...' : 'Convidar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function UsuariosTab() {
  const { profile: myProfile } = useAuth()
  const { data: profiles, isLoading } = useProfiles()
  const updateRole = useUpdateUserRole()
  const deactivate = useDeactivateUser()
  const [showInvite, setShowInvite] = useState(false)

  const handleRoleChange = async (profileId: string, role: UserRole) => {
    try {
      await updateRole.mutateAsync({ profileId, role })
      toast.success('Papel atualizado')
    } catch {
      toast.error('Erro ao atualizar papel')
    }
  }

  const handleDeactivate = async (profileId: string) => {
    if (!confirm('Desativar este usuário? Ele perde acesso ao sistema.')) return
    try {
      await deactivate.mutateAsync(profileId)
      toast.success('Usuário desativado')
    } catch {
      toast.error('Erro ao desativar')
    }
  }

  if (isLoading) return <p className="font-sans text-sm text-gray-400">Carregando usuários...</p>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-rosa-vivid text-white hover:bg-rosa-mid">
          <Plus size={16} /> Convidar usuário
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full font-sans text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="px-5 py-2.5">Nome</th>
              <th className="px-5 py-2.5">Papel</th>
              <th className="px-5 py-2.5">Status</th>
              <th className="px-5 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => {
              const isSelf = p.id === myProfile?.id
              return (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800 font-semibold">{p.full_name} {isSelf && <span className="text-gray-400 font-normal">(você)</span>}</td>
                  <td className="px-5 py-2.5">
                    <select
                      value={p.role}
                      disabled={isSelf}
                      onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                      className="border border-areia-warm rounded-lg px-2 py-1 font-sans text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`font-sans text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.active ? 'bg-verde-pale text-verde-vivid' : 'bg-gray-100 text-gray-400'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {!isSelf && p.active && (
                      <button onClick={() => handleDeactivate(p.id)} className="font-sans text-xs text-rosa-vivid hover:underline">Desativar</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <InviteUserModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  )
}

// ============================================================
// TAB 2 — CONSTANTES
// ============================================================
function ConstanteRow({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  return (
    <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
      <p className="font-sans text-sm text-gray-700">{label}</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} className="w-32 border border-areia-warm rounded-lg px-2 py-1 font-sans text-sm text-right focus:outline-none focus:border-verde-vivid" />
          <button onClick={() => { onSave(draft); setEditing(false) }} className="font-sans text-xs text-verde-vivid font-semibold">Salvar</button>
          <button onClick={() => { setDraft(value); setEditing(false) }} className="font-sans text-xs text-gray-400">Cancelar</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="font-sans text-sm font-semibold text-gray-900 hover:text-verde-vivid">{value}</button>
      )}
    </div>
  )
}

function ConstantesTab() {
  const { profile } = useAuth()
  const { data: constants, isLoading } = useBusinessConstants()
  const updateConstant = useUpdateBusinessConstant()
  const { data: invSettings } = useInventorySettings()
  const updateReorder = useUpdateReorderPointConfig()
  const { data: cmvComponents } = useCMVComponentsConfig()
  const updateCMV = useUpdateCMVComponentConfig()
  const [cmvConfirm, setCmvConfirm] = useState<{ id: string; value: number } | null>(null)

  const saveConstant = async (key: string, raw: string) => {
    let parsed: unknown = raw
    try { parsed = JSON.parse(raw) } catch { /* mantém string */ }
    try {
      await updateConstant.mutateAsync({ key, value: parsed, changedBy: profile?.id ?? '' })
      toast.success('Constante atualizada')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const saveReorderPoint = async (sku: string, raw: string) => {
    const n = Number(raw)
    if (Number.isNaN(n)) { toast.error('Valor inválido'); return }
    try {
      await updateReorder.mutateAsync({ sku, reorder_point: n })
      toast.success('Ponto de reposição atualizado')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const confirmCMVChange = async () => {
    if (!cmvConfirm) return
    try {
      await updateCMV.mutateAsync(cmvConfirm)
      toast.success('CMV atualizado')
    } catch {
      toast.error('Erro ao atualizar CMV')
    } finally {
      setCmvConfirm(null)
    }
  }

  if (isLoading) return <p className="font-sans text-sm text-gray-400">Carregando constantes...</p>

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><p className="font-serif text-lg text-gray-900">Constantes financeiras e comerciais</p></div>
        {(constants ?? []).map((c) => (
          <ConstanteRow key={c.key} label={c.label} value={typeof c.value === 'string' ? c.value : JSON.stringify(c.value)} onSave={(v) => saveConstant(c.key, v)} />
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><p className="font-serif text-lg text-gray-900">Pontos de reposição por SKU</p></div>
        {(invSettings ?? []).map((s: { sku: string; reorder_point: number }) => (
          <ConstanteRow key={s.sku} label={SKU_LABELS[s.sku] ?? s.sku} value={String(s.reorder_point)} onSave={(v) => saveReorderPoint(s.sku, v)} />
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-serif text-lg text-gray-900">CMV por componente (atenção — afeta margem)</p>
        </div>
        {(cmvComponents ?? []).map((c: { id: string; sku: string; label: string; value: number }) => (
          <ConstanteRow
            key={c.id}
            label={`${SKU_LABELS[c.sku] ?? c.sku} — ${c.label}`}
            value={formatCurrency(Number(c.value))}
            onSave={(v) => {
              const n = Number(v.replace(/[^\d.,-]/g, '').replace(',', '.'))
              if (Number.isNaN(n)) { toast.error('Valor inválido'); return }
              setCmvConfirm({ id: c.id, value: n })
            }}
          />
        ))}
      </div>

      <Modal open={!!cmvConfirm} onClose={() => setCmvConfirm(null)} title="Confirmar alteração de CMV">
        <div className="space-y-4">
          <p className="font-sans text-sm text-gray-700">Alteração de CMV afeta todos os cálculos de margem do sistema. Tem certeza que deseja prosseguir?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCmvConfirm(null)} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancelar</button>
            <button onClick={confirmCMVChange} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-rosa-vivid text-white hover:bg-rosa-mid">Confirmar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================
// TAB 3 — INTEGRAÇÕES
// ============================================================
function IntegracoesTab() {
  const { data: integrations, isLoading } = useIntegrationsStatus()
  const { data: lastBling } = useLastBlingWebhook()

  const copyWebhook = (path: string) => {
    navigator.clipboard.writeText(`${SUPABASE_URL}/functions/v1/${path}`)
    toast.success('URL copiada')
  }

  if (isLoading) return <p className="font-sans text-sm text-gray-400">Verificando integrações...</p>

  return (
    <div className="space-y-4">
      <p className="font-sans text-xs text-gray-400 bg-areia rounded-lg px-4 py-3">
        Credenciais são configuradas via Supabase Secrets. Não é possível editá-las aqui por segurança.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(integrations ?? []).map((i) => (
          <div key={i.key} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-sans font-semibold text-sm text-gray-800">{i.name}</p>
              {i.connected
                ? <CheckCircle size={16} className="text-verde-vivid" />
                : <XCircle size={16} className="text-gray-300" />}
            </div>
            <p className="font-sans text-xs text-gray-400">{i.connected ? 'Conectado' : 'Desconectado'}</p>
            {i.key === 'bling' && (
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                <p className="font-sans text-xs text-gray-500">
                  Último webhook: {lastBling ? `NF ${lastBling.nf_number} — ${formatDate(String(lastBling.synced_at).slice(0, 10))}` : 'nenhum ainda'}
                </p>
                <button onClick={() => copyWebhook('bling-webhook')} className="flex items-center gap-1.5 font-sans text-xs text-gray-500 hover:text-verde-vivid">
                  <Copy size={12} /> Copiar URL do webhook
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// TAB 4 — CANAIS
// ============================================================
function CanaisTab() {
  const { data: channels, isLoading } = useChannelSettings()
  const updateChannel = useUpdateChannelSetting()

  const handleUpdate = async (canal_type: string, field: string, value: string | number | boolean) => {
    try {
      await updateChannel.mutateAsync({ canal_type, [field]: value })
      toast.success('Canal atualizado')
    } catch {
      toast.error('Erro ao atualizar canal')
    }
  }

  if (isLoading) return <p className="font-sans text-sm text-gray-400">Carregando canais...</p>

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full font-sans text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
            <th className="px-5 py-2.5">Canal</th>
            <th className="px-5 py-2.5">Cor</th>
            <th className="px-5 py-2.5">Frete médio</th>
            <th className="px-5 py-2.5">Ativo</th>
          </tr>
        </thead>
        <tbody>
          {(channels ?? []).map((c) => (
            <tr key={c.canal_type} className="border-b border-gray-50 last:border-0">
              <td className="px-5 py-2.5 text-gray-800 font-semibold">{c.display_name}</td>
              <td className="px-5 py-2.5">
                <input type="color" defaultValue={c.color} onBlur={(e) => handleUpdate(c.canal_type, 'color', e.target.value)} className="w-8 h-8 rounded border-0 cursor-pointer" />
              </td>
              <td className="px-5 py-2.5">
                <input
                  type="number"
                  step="0.01"
                  defaultValue={c.freight_avg}
                  onBlur={(e) => handleUpdate(c.canal_type, 'freight_avg', Number(e.target.value))}
                  className="w-24 border border-areia-warm rounded-lg px-2 py-1 font-sans text-sm focus:outline-none focus:border-verde-vivid"
                />
              </td>
              <td className="px-5 py-2.5">
                <input type="checkbox" checked={c.enabled} onChange={(e) => handleUpdate(c.canal_type, 'enabled', e.target.checked)} className="w-4 h-4 accent-verde-vivid cursor-pointer" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// TAB 5 — NOTIFICAÇÕES
// ============================================================
function NotificacoesTab() {
  const { data: profiles } = useProfiles()
  const { data: notifSettings } = useNotificationSettings()
  const updateNotif = useUpdateNotificationSetting()

  const settingsByUser = new Map((notifSettings ?? []).map((s) => [s.user_id, s]))

  const handleToggle = async (userId: string, field: 'cash_alerts' | 'lead_followup_alerts' | 'ads_budget_alerts', current: boolean) => {
    try {
      await updateNotif.mutateAsync({ user_id: userId, [field]: !current })
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  const handlePhone = async (userId: string, whatsapp_number: string) => {
    try {
      await updateNotif.mutateAsync({ user_id: userId, whatsapp_number })
      toast.success('Número salvo')
    } catch {
      toast.error('Erro ao salvar número')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full font-sans text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
            <th className="px-5 py-2.5">Usuário</th>
            <th className="px-5 py-2.5">WhatsApp</th>
            <th className="px-5 py-2.5 text-center">Caixa</th>
            <th className="px-5 py-2.5 text-center">Leads</th>
            <th className="px-5 py-2.5 text-center">Ads</th>
          </tr>
        </thead>
        <tbody>
          {(profiles ?? []).map((p) => {
            const s = settingsByUser.get(p.user_id)
            return (
              <tr key={p.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-2.5 text-gray-800 font-semibold">{p.full_name}</td>
                <td className="px-5 py-2.5">
                  <input
                    defaultValue={s?.whatsapp_number ?? ''}
                    onBlur={(e) => handlePhone(p.user_id, e.target.value)}
                    placeholder="+55 11 9...."
                    className="w-36 border border-areia-warm rounded-lg px-2 py-1 font-sans text-xs focus:outline-none focus:border-verde-vivid"
                  />
                </td>
                <td className="px-5 py-2.5 text-center">
                  <input type="checkbox" checked={s?.cash_alerts ?? true} onChange={() => handleToggle(p.user_id, 'cash_alerts', s?.cash_alerts ?? true)} className="w-4 h-4 accent-verde-vivid cursor-pointer" />
                </td>
                <td className="px-5 py-2.5 text-center">
                  <input type="checkbox" checked={s?.lead_followup_alerts ?? true} onChange={() => handleToggle(p.user_id, 'lead_followup_alerts', s?.lead_followup_alerts ?? true)} className="w-4 h-4 accent-verde-vivid cursor-pointer" />
                </td>
                <td className="px-5 py-2.5 text-center">
                  <input type="checkbox" checked={s?.ads_budget_alerts ?? true} onChange={() => handleToggle(p.user_id, 'ads_budget_alerts', s?.ads_budget_alerts ?? true)} className="w-4 h-4 accent-verde-vivid cursor-pointer" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// PÁGINA
// ============================================================
export default function ConfiguracoesPage() {
  const { isAdmin, isLoading } = useAuth()
  const [tab, setTab] = useState<TabKey>('usuarios')

  if (isLoading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Configurações</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Usuários, constantes, integrações, canais e notificações</p>
      </div>

      <div className="flex gap-1 bg-areia rounded-xl p-1 w-fit overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm transition-all whitespace-nowrap ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'usuarios' && <UsuariosTab />}
      {tab === 'constantes' && <ConstantesTab />}
      {tab === 'integracoes' && <IntegracoesTab />}
      {tab === 'canais' && <CanaisTab />}
      {tab === 'notificacoes' && <NotificacoesTab />}
    </div>
  )
}
