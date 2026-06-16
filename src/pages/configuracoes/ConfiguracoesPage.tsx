import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { CheckCircle, XCircle, RefreshCw, ExternalLink, Zap, Instagram, FileText, Cloud } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const BLING_WH   = `${SUPABASE_URL}/functions/v1/bling-webhook`
const IG_WH      = `${SUPABASE_URL}/functions/v1/instagram-sync`
const DRIVE_WH   = `${SUPABASE_URL}/functions/v1/drive-webhook`

async function callFn(url: string, opts: RequestInit = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts })
  return r.json()
}

function IntegrationCard({
  icon, title, description, status, onConnect, onSync, syncing, connecting, extra
}: {
  icon: React.ReactNode; title: string; description: string
  status: { conectado: boolean; detalhe?: string } | null
  onConnect?: () => void; onSync?: () => void
  syncing?: boolean; connecting?: boolean
  extra?: React.ReactNode
}) {
  const ok = status?.conectado

  return (
    <div className="bg-white border border-areia-warm rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ok ? 'bg-verde-pale' : 'bg-areia'}`}>
          <span className={ok ? 'text-verde-vivid' : 'text-gray-400'}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-sans font-semibold text-sm text-gray-800">{title}</h3>
            {ok !== null && (
              ok
                ? <CheckCircle size={14} className="text-verde-vivid" />
                : <XCircle size={14} className="text-gray-300" />
            )}
          </div>
          <p className="font-sans text-xs text-gray-400">{description}</p>
          {status?.detalhe && (
            <p className="font-sans text-xs text-gray-400 mt-0.5">{status.detalhe}</p>
          )}
          {extra}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {onSync && ok && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 border border-areia-warm rounded-lg hover:border-verde-vivid hover:text-verde-vivid text-gray-500 transition-all disabled:opacity-40"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sync'}
            </button>
          )}
          {onConnect && (
            <button
              onClick={onConnect}
              disabled={connecting}
              className={`flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 ${
                ok
                  ? 'border border-areia-warm text-gray-400 hover:border-rosa-vivid hover:text-rosa-vivid'
                  : 'bg-verde-vivid text-white hover:bg-verde-vivid/90'
              }`}
            >
              {connecting ? 'Conectando...' : ok ? 'Reconectar' : 'Conectar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const qc = useQueryClient()
  const [igToken, setIgToken] = useState('')
  const [igAccountId, setIgAccountId] = useState('')
  const [showIgForm, setShowIgForm] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  // Status das integrações
  const { data: blingStatus } = useQuery({
    queryKey: ['bling-status'],
    queryFn: () => callFn(BLING_WH),
    refetchInterval: 30000,
  })
  const { data: igStatus } = useQuery({
    queryKey: ['ig-status'],
    queryFn: () => callFn(`${IG_WH}?action=status`),
    refetchInterval: 30000,
  })
  const { data: driveStatus } = useQuery({
    queryKey: ['drive-status'],
    queryFn: () => callFn(`${DRIVE_WH}`),
    refetchInterval: 30000,
  })

  // Sync Bling
  const syncBling = async () => {
    setSyncing('bling')
    try {
      const r = await callFn(`${BLING_WH}?action=sync`)
      flash(r.ok ? `${r.synced} NFs sincronizadas do Bling ✓` : r.error, r.ok)
      qc.invalidateQueries({ queryKey: ['bling-status'] })
    } finally { setSyncing(null) }
  }

  // Sync Instagram
  const syncIG = async () => {
    setSyncing('ig')
    try {
      const r = await callFn(`${IG_WH}?action=sync`)
      if (r.ok) flash(`Instagram sincronizado — ${r.metrics?.followers?.toLocaleString('pt-BR')} seguidores ✓`)
      else flash(r.error, false)
    } finally { setSyncing(null) }
  }

  // Sync Drive (chama o Drive MCP → Supabase via webhook)
  const syncDrive = async () => {
    setSyncing('drive')
    try {
      const r = await callFn(DRIVE_WH)
      flash(r.ok ? `Drive conectado — ${r.registros} registros no sistema ✓` : 'Sync de Drive requer abertura via Claude', r.ok)
    } finally { setSyncing(null) }
  }

  // Conectar Bling (abre OAuth)
  const conectarBling = async () => {
    const r = await callFn(`${BLING_WH}?action=auth_url`)
    if (r.url) window.open(r.url, '_blank')
    else flash('Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET nos secrets do Supabase primeiro', false)
  }

  // Salvar token Instagram
  const salvarIG = async () => {
    if (!igToken || !igAccountId) return flash('Preencha token e Account ID', false)
    const r = await callFn(`${IG_WH}?action=save_token`, {
      method: 'POST',
      body: JSON.stringify({ token: igToken, account_id: igAccountId }),
    })
    if (r.ok) {
      flash('Token Instagram salvo ✓')
      setShowIgForm(false)
      setIgToken(''); setIgAccountId('')
      qc.invalidateQueries({ queryKey: ['ig-status'] })
    } else flash(r.error, false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Configurações</h1>
        <p className="font-sans text-sm text-gray-400 mt-0.5">Integrações e conexões do Guadalupe OS</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg font-sans text-sm font-medium ${
          msg.ok ? 'bg-verde-pale text-verde-vivid' : 'bg-rosa-pale text-rosa-vivid'
        }`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Integrações ativas</h2>

        {/* Bling */}
        <IntegrationCard
          icon={<FileText size={20} />}
          title="Bling ERP"
          description={`Sincroniza NFs emitidas automaticamente via webhook · ${blingStatus?.nfs_no_sistema ?? 0} NFs no sistema`}
          status={blingStatus ? { conectado: blingStatus.conectado, detalhe: blingStatus.conectado ? 'Webhook ativo — NFs sincronizadas em tempo real' : 'Aguardando autenticação OAuth' } : null}
          onConnect={conectarBling}
          onSync={syncBling}
          syncing={syncing === 'bling'}
          extra={
            <div className="mt-2">
              <p className="font-sans text-[11px] text-gray-400">
                Webhook URL: <code className="bg-areia px-1.5 py-0.5 rounded text-[10px]">
                  {SUPABASE_URL}/functions/v1/bling-webhook
                </code>
              </p>
            </div>
          }
        />

        {/* Instagram */}
        <IntegrationCard
          icon={<Instagram size={20} />}
          title="Instagram @guadalupe.drink"
          description="Seguidores, alcance, impressões e engajamento (últimos 30 dias)"
          status={igStatus ? { conectado: igStatus.conectado, detalhe: igStatus.conectado ? `Último sync: ${igStatus.ultimo_sync ?? 'nunca'}` : 'Token de acesso necessário' } : null}
          onConnect={() => setShowIgForm(v => !v)}
          onSync={syncIG}
          syncing={syncing === 'ig'}
          extra={
            showIgForm ? (
              <div className="mt-3 space-y-2 p-3 bg-areia rounded-lg">
                <p className="font-sans text-xs text-gray-500 mb-2">
                  Obtenha em: <a href="https://developers.facebook.com" target="_blank" className="text-verde-vivid underline">developers.facebook.com</a> → Seu App → Instagram Graph API → Access Token
                </p>
                <input
                  value={igToken}
                  onChange={e => setIgToken(e.target.value)}
                  placeholder="Access Token (EAAxxxx...)"
                  className="w-full px-3 py-2 border border-areia-warm rounded-lg font-mono text-xs bg-white focus:outline-none focus:border-verde-vivid"
                />
                <input
                  value={igAccountId}
                  onChange={e => setIgAccountId(e.target.value)}
                  placeholder="Instagram Business Account ID"
                  className="w-full px-3 py-2 border border-areia-warm rounded-lg font-mono text-xs bg-white focus:outline-none focus:border-verde-vivid"
                />
                <div className="flex gap-2">
                  <button onClick={salvarIG} className="bg-verde-vivid text-white font-sans text-xs font-semibold px-3 py-1.5 rounded-lg">Salvar</button>
                  <button onClick={() => setShowIgForm(false)} className="font-sans text-xs text-gray-400 px-3 py-1.5">Cancelar</button>
                </div>
              </div>
            ) : null
          }
        />

        {/* Google Drive */}
        <IntegrationCard
          icon={<Cloud size={20} />}
          title="Google Drive — Fluxo de Caixa"
          description={`Sincronização Drive → Sistema · ${driveStatus?.registros ?? 75} registros importados`}
          status={driveStatus ? { conectado: driveStatus.ok, detalhe: 'Sync manual via Claude ou botão abaixo' } : null}
          onSync={syncDrive}
          syncing={syncing === 'drive'}
        />
      </div>

      {/* Webhook URLs para copiar */}
      <div className="bg-white border border-areia-warm rounded-xl p-5">
        <h3 className="font-sans font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <Zap size={14} className="text-amarelo-vivid" /> URLs de Webhook
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Bling ERP', url: `${SUPABASE_URL}/functions/v1/bling-webhook` },
            { label: 'Instagram Sync', url: `${SUPABASE_URL}/functions/v1/instagram-sync` },
            { label: 'Drive Webhook', url: `${SUPABASE_URL}/functions/v1/drive-webhook` },
          ].map(w => (
            <div key={w.label} className="flex items-center gap-2">
              <span className="font-sans text-xs text-gray-500 w-28 flex-shrink-0">{w.label}</span>
              <code className="flex-1 font-mono text-[10px] bg-areia px-2 py-1 rounded truncate text-gray-600">{w.url}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(w.url); flash(`URL ${w.label} copiada ✓`) }}
                className="font-sans text-[10px] text-gray-400 hover:text-verde-vivid transition-colors flex-shrink-0"
              >
                Copiar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
