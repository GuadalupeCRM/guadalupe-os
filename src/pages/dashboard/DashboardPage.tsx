// src/pages/dashboard/DashboardPage.tsx
// Guadalupe OS — Dashboard principal
// Breakeven e MC calculados via fn_mc_from_nfs() — preços reais das NFs, sem hardcode

import { useState, useEffect } from 'react'
import { useDashboard } from '../../hooks/useDashboard'
import { supabase } from '../../lib/supabase'

// ─── Cores Guadalupe IDV ────────────────────────────────────────────────────
const G = {
  verde:    '#6BB42E',
  verdeM:   '#A2C96C',
  verdePale:'#E6F0D7',
  rosa:     '#E21655',
  rosaM:    '#F18EA0',
  rosaPale: '#FBE4EA',
  amarelo:  '#FAAE1A',
  amareloM: '#FED873',
  arenaPale:'#FEEDC1',
  areia:    '#FFFBF0',
  areiaMid: '#F1EFE9',
  branco:   '#FFFFFF',
  cinzaT:   '#374151',
  cinzaS:   '#6B7280',
} as const

// ─── Tipografia IDV ─────────────────────────────────────────────────────────
const font = {
  title: '"DM Serif Display", serif',
  body:  '"Barlow Condensed", sans-serif',
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function fNum(v: number) {
  return new Intl.NumberFormat('pt-BR').format(v)
}
function fPct(v: number) {
  return `${v.toFixed(1)}%`
}
function fDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Card base ──────────────────────────────────────────────────────────────
interface CardProps {
  label: string
  value: string
  sub?: string
  accent?: string
  loading?: boolean
  icon?: string
}

function MetricCard({ label, value, sub, accent = G.verde, loading = false, icon }: CardProps) {
  return (
    <div
      style={{
        background: G.branco,
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        borderTop: `4px solid ${accent}`,
        fontFamily: font.body,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: G.cinzaS }}>
          {label}
        </span>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      {loading ? (
        <div style={{ height: 32, background: G.areiaMid, borderRadius: 8, marginTop: 10, animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, color: G.cinzaT, marginTop: 8, fontFamily: font.title, lineHeight: 1.1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 12, color: G.cinzaS, marginTop: 4 }}>{sub}</div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Barra de breakeven ──────────────────────────────────────────────────────
function BreakevenBar({ pct, latasParaBreak, loading }: { pct: number; latasParaBreak: number; loading: boolean }) {
  const clampedPct = Math.min(Math.max(pct, 0), 100)
  const color = pct >= 100 ? G.verde : pct >= 70 ? G.amarelo : G.rosa

  return (
    <div
      style={{
        background: G.branco,
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        fontFamily: font.body,
        gridColumn: '1 / -1',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: font.title, fontSize: 16, color: G.cinzaT }}>
          Progresso do Breakeven — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <span style={{ fontSize: 22, fontWeight: 700, color, fontFamily: font.title }}>
          {loading ? '…' : fPct(pct)}
        </span>
      </div>

      {/* Barra */}
      <div style={{ background: G.areiaMid, borderRadius: 99, height: 14, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: loading ? '0%' : `${clampedPct}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 11, color: G.cinzaS }}>
          MC acumulada / Custo fixo R$11.473,87
        </span>
        {!loading && latasParaBreak > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: G.rosa }}>
            ⚠ Faltam {fNum(latasParaBreak)} latas para fechar o breakeven
          </span>
        )}
        {!loading && latasParaBreak === 0 && pct >= 100 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: G.verde }}>
            ✓ Breakeven atingido
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Insight card ────────────────────────────────────────────────────────────
interface Insight {
  id: string
  insight_type: 'alerta' | 'sugestao' | 'info'
  title: string
  message: string
  action_label?: string
  action_url?: string
  created_at: string
  read_by: string[]
}

function InsightCard({ insight, userId, onRead }: { insight: Insight; userId?: string; onRead: (id: string) => void }) {
  const isRead = userId ? insight.read_by?.includes(userId) : false
  const typeColor = insight.insight_type === 'alerta' ? G.rosa : insight.insight_type === 'sugestao' ? G.amarelo : G.verde

  return (
    <div
      style={{
        background: isRead ? G.areiaMid : G.branco,
        borderRadius: 12,
        padding: '14px 18px',
        boxShadow: isRead ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        borderLeft: `3px solid ${typeColor}`,
        fontFamily: font.body,
        opacity: isRead ? 0.65 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: typeColor,
                background: typeColor + '18',
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              {insight.insight_type}
            </span>
            <span style={{ fontSize: 11, color: G.cinzaS }}>
              {new Date(insight.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.cinzaT, marginBottom: 4 }}>{insight.title}</div>
          <div style={{ fontSize: 12, color: G.cinzaS, lineHeight: 1.5 }}>{insight.message}</div>
          {insight.action_label && insight.action_url && (
            <a
              href={insight.action_url}
              style={{ fontSize: 12, color: G.verde, fontWeight: 600, marginTop: 6, display: 'inline-block' }}
            >
              {insight.action_label} →
            </a>
          )}
        </div>
        {!isRead && userId && (
          <button
            onClick={() => onRead(insight.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: G.cinzaS,
              padding: '2px 6px',
              borderRadius: 6,
            }}
            title="Marcar como lido"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const dash = useDashboard()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [insights, setInsights] = useState<Insight[]>([])
  const [insightsLoaded, setInsightsLoaded] = useState(false)

  // Carrega insights ao montar
  useEffect(() => {
    supabase
      .from('agent_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setInsights(data ?? [])
        setInsightsLoaded(true)
      })
  }, [])

  // Sincroniza NFs manualmente
  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bling-sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      )
      const data = await res.json()
      setSyncMsg(
        data.error
          ? `Erro: ${data.error}`
          : `Sincronizado: ${data.synced} NF(s) novas, ${data.classified} canais identificados, ${data.patternLearned} por padrão`
      )
      dash.refetch()
    } catch {
      setSyncMsg('Falha ao conectar com o servidor')
    } finally {
      setSyncing(false)
    }
  }

  // Marca insight como lido
  async function handleReadInsight(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.rpc('mark_insight_read', { p_insight_id: id, p_user_id: user.id }).catch(() => null)
    setInsights(prev => prev.map(i => i.id === id ? { ...i, read_by: [...(i.read_by ?? []), user.id] } : i))
  }

  const unreadCount = insights.filter(i => i.read_by?.length === 0).length

  return (
    <div style={{ background: G.areia, minHeight: '100vh', padding: '28px 32px', fontFamily: font.body }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: font.title, fontSize: 28, color: G.cinzaT, margin: 0, fontWeight: 400 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: G.cinzaS, margin: '4px 0 0' }}>
            {fDate(dash.periodoFrom)} → {fDate(dash.periodoTo)}
            {' · '}MC calculada via NFs reais do Bling
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {syncMsg && (
            <span style={{ fontSize: 12, color: syncMsg.startsWith('Erro') ? G.rosa : G.verde }}>
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: syncing ? G.areiaMid : G.verde,
              color: G.branco,
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: font.body,
              cursor: syncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.2s',
            }}
          >
            {syncing ? '⟳ Sincronizando…' : '↻ Sincronizar NFs'}
          </button>
        </div>
      </div>

      {/* Erro */}
      {dash.error && (
        <div style={{
          background: G.rosaPale, border: `1px solid ${G.rosaM}`, borderRadius: 12,
          padding: '12px 18px', marginBottom: 20, fontSize: 13, color: G.rosa,
        }}>
          {dash.error} —{' '}
          <button onClick={dash.refetch} style={{ background: 'none', border: 'none', color: G.rosa, fontWeight: 600, cursor: 'pointer' }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Barra de breakeven */}
      <div style={{ marginBottom: 20 }}>
        <BreakevenBar pct={dash.breakevenPct} latasParaBreak={dash.latasParaBreak} loading={dash.loading} />
      </div>

      {/* Grade principal — financeiro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <MetricCard
          label="Caixa Atual"
          value={fBRL(dash.caixaAtual)}
          sub="Saldo líquido entradas − saídas"
          accent={dash.caixaAtual >= 0 ? G.verde : G.rosa}
          loading={dash.loading}
          icon="💳"
        />
        <MetricCard
          label="MC do Mês"
          value={fBRL(dash.mcTotal)}
          sub={`MC/lata: ${fBRL(dash.mcPorLata)} · ${fBRL(dash.fixedCosts)} custo fixo`}
          accent={dash.mcTotal >= dash.fixedCosts ? G.verde : G.amarelo}
          loading={dash.loading}
          icon="📊"
        />
        <MetricCard
          label="Receita da Semana"
          value={fBRL(dash.receitaSemana)}
          sub="Últimos 7 dias (entradas)"
          accent={G.amarelo}
          loading={dash.loading}
          icon="📈"
        />
      </div>

      {/* Grade — produção */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <MetricCard
          label="Latas Vendidas no Mês"
          value={fNum(dash.totalLatas) + ' latas'}
          sub={`${fNum(Math.round(dash.totalLatas / 12))} caixas · Receita ${fBRL(dash.totalReceita)}`}
          accent={G.verde}
          loading={dash.loading}
          icon="🍋"
        />
        <MetricCard
          label="Latas para Breakeven"
          value={dash.latasParaBreak === 0 ? '✓ Atingido' : fNum(dash.latasParaBreak) + ' latas'}
          sub={dash.latasParaBreak > 0
            ? `≈ ${fNum(Math.round(dash.latasParaBreak / 12))} cx · ${fNum(Math.round(dash.latasParaBreak / 6))} dias restantes`
            : `Breakeven superado em ${fBRL(dash.mcTotal - dash.fixedCosts)}`}
          accent={dash.latasParaBreak === 0 ? G.verde : G.rosa}
          loading={dash.loading}
          icon={dash.latasParaBreak === 0 ? '🎯' : '⚠️'}
        />
        <MetricCard
          label="CMV Total"
          value={fBRL(dash.mcTotal + (dash.totalLatas * 0))}
          sub={`CMV estimado: ${fBRL(dash.totalReceita - dash.mcTotal)}`}
          accent={G.verdeM}
          loading={dash.loading}
          icon="🏭"
        />
      </div>

      {/* Grade — comercial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <MetricCard
          label="Leads Ativos"
          value={fNum(dash.leadsAtivos)}
          sub="Excluindo perdidos e inativos"
          accent={G.verde}
          loading={dash.loading}
          icon="🤝"
        />
        <MetricCard
          label="Conversões B2C"
          value={fNum(dash.conversoesB2C)}
          sub="Pedidos Shopify no mês"
          accent={G.amarelo}
          loading={dash.loading}
          icon="🛒"
        />
        <MetricCard
          label="Eventos no Mês"
          value={fNum(dash.eventosMes)}
          sub="Canal Evento"
          accent={G.rosa}
          loading={dash.loading}
          icon="🎉"
        />
      </div>

      {/* Insights dos agentes */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontFamily: font.title, fontSize: 18, color: G.cinzaT, margin: 0, fontWeight: 400 }}>
            Alertas & Sugestões dos Agentes
            {unreadCount > 0 && (
              <span style={{
                background: G.rosa, color: G.branco, fontSize: 11, fontWeight: 700,
                borderRadius: 99, padding: '2px 8px', marginLeft: 10, fontFamily: font.body,
              }}>
                {unreadCount}
              </span>
            )}
          </h2>
          {insightsLoaded && insights.length === 0 && (
            <span style={{ fontSize: 12, color: G.cinzaS }}>Nenhum alerta no momento ✓</span>
          )}
        </div>

        {!insightsLoaded ? (
          <div style={{ color: G.cinzaS, fontSize: 13 }}>Carregando…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onRead={handleReadInsight}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${G.areiaMid}`, textAlign: 'right' }}>
        <span style={{ fontSize: 11, color: G.cinzaS, fontFamily: font.body }}>
          Guadalupe OS · CNPJ 58.920.022/0001-50 · #BebaComModeração
        </span>
      </div>
    </div>
  )
}
