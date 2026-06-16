import { Fragment, useState } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import { CHANNEL_LABELS } from '../../../constants/business'
import { useBlingNFs, useSyncBlingNFs, useCorrectNFCanal } from '../../../hooks/useFinanceiro'
import type { CanaisType } from '../../../types'

const CANAL_BADGE: Record<string, string> = {
  evento: 'bg-amarelo-pale text-yellow-700',
  on_trade: 'bg-verde-pale text-verde-vivid',
  distribuidor: 'bg-blue-50 text-blue-600',
  dtc_site: 'bg-rosa-pale text-rosa-vivid',
  dtc_ml: 'bg-purple-50 text-purple-600',
  dtc_amazon: 'bg-orange-50 text-orange-600',
}

const STATUS_LABELS: Record<string, string> = {
  autorizada: 'Autorizada',
  cancelada: 'Cancelada',
  pendente: 'Pendente',
}

const STATUS_BADGE: Record<string, string> = {
  autorizada: 'bg-verde-pale text-verde-vivid',
  cancelada: 'bg-rosa-pale text-rosa-vivid',
  pendente: 'bg-amarelo-pale text-yellow-700',
}

const CANAL_OPTIONS: CanaisType[] = ['evento', 'on_trade', 'distribuidor', 'dtc_site', 'dtc_ml', 'dtc_amazon']

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'nunca'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function NFsBlingTab() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [canal, setCanal] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useBlingNFs({ startDate, endDate, canal, status, search })
  const sync = useSyncBlingNFs()
  const correctCanal = useCorrectNFCanal()

  const handleSync = async () => {
    try {
      await sync.mutateAsync()
      toast.success('Sincronização concluída')
    } catch {
      toast.error('Erro ao sincronizar com Bling')
    }
  }

  const handleCorrectCanal = async (id: string, newCanal: CanaisType) => {
    try {
      await correctCanal.mutateAsync({ id, canal: newCanal })
      toast.success('Canal atualizado')
    } catch {
      toast.error('Erro ao atualizar canal')
    }
  }

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando NFs...</p>
  }

  const { nfs, lastSync, statsByCanal } = data

  return (
    <div className="space-y-5">
      {/* Sync status */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-areia border border-gray-200 rounded-xl p-4">
        <p className="font-sans text-sm text-gray-600">
          Última sincronização: <span className="font-semibold text-gray-800">{formatSyncTime(lastSync)}</span>
        </p>
        <button
          onClick={handleSync}
          disabled={sync.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50"
        >
          <RefreshCw size={14} className={sync.isPending ? 'animate-spin' : ''} />
          {sync.isPending ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
      </div>

      {/* Estatísticas por canal (mês atual) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsByCanal.length === 0 ? (
          <p className="font-sans text-sm text-gray-400 col-span-full">Sem NFs no mês atual.</p>
        ) : statsByCanal.map((s) => (
          <div key={s.canal} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              {s.canal === 'sem_canal' ? 'Sem canal' : CHANNEL_LABELS[s.canal] ?? s.canal}
            </p>
            <p className="font-serif text-lg text-gray-900">{formatCurrency(s.total)}</p>
            <p className="font-sans text-xs text-gray-400">{s.count} NF{s.count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">De</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Até</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Canal</label>
          <select value={canal} onChange={(e) => setCanal(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid text-gray-600">
            <option value="todos">Todos</option>
            <option value="sem_canal">Sem canal</option>
            {CANAL_OPTIONS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid text-gray-600">
            <option value="todos">Todos</option>
            <option value="autorizada">Autorizada</option>
            <option value="cancelada">Cancelada</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Buscar</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cliente, CNPJ ou NF..."
              className="w-full pl-9 pr-3 py-2 border border-areia-warm rounded-lg font-sans text-sm bg-white focus:outline-none focus:border-verde-vivid"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5">NF</th>
                <th className="px-5 py-2.5">Cliente</th>
                <th className="px-5 py-2.5">CNPJ</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
                <th className="px-5 py-2.5">Canal</th>
                <th className="px-5 py-2.5">Data</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {nfs.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">Nenhuma NF encontrada com esses filtros.</td></tr>
              ) : nfs.map((nf) => {
                const isExpanded = expanded === nf.id
                const noCanal = !nf.canal
                return (
                  <Fragment key={nf.id}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : nf.id)}
                      className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-areia/50 ${noCanal ? 'bg-amarelo-pale/50' : ''}`}
                    >
                      <td className="px-5 py-2.5 text-gray-800 font-semibold">#{nf.nf_number}</td>
                      <td className="px-5 py-2.5 text-gray-800">{nf.cliente}</td>
                      <td className="px-5 py-2.5 text-gray-400">{nf.cnpj ?? '—'}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(Number(nf.valor))}</td>
                      <td className="px-5 py-2.5">
                        {noCanal ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amarelo-pale text-yellow-700">
                            Aguardando classificação
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CANAL_BADGE[nf.canal!] ?? 'bg-gray-100 text-gray-500'}`}>
                            {CHANNEL_LABELS[nf.canal!] ?? nf.canal}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-gray-500">{formatDate(nf.data)}</td>
                      <td className="px-5 py-2.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_BADGE[nf.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[nf.status] ?? nf.status}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-areia/40 border-b border-gray-50">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="flex items-start justify-between flex-wrap gap-4">
                            <div>
                              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Dados da NF</p>
                              <pre className="font-sans text-xs text-gray-600 bg-white rounded-lg p-3 border border-gray-100 overflow-x-auto">
{JSON.stringify({
  nf_number: nf.nf_number,
  cliente: nf.cliente,
  cnpj: nf.cnpj,
  valor: Number(nf.valor),
  canal: nf.canal,
  data: nf.data,
  status: nf.status,
  ...(nf.raw_data ?? {}),
}, null, 2)}
                              </pre>
                            </div>
                            <div className="flex flex-col gap-2">
                              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">Corrigir canal</p>
                              <div className="flex gap-2 flex-wrap">
                                {CANAL_OPTIONS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={(e) => { e.stopPropagation(); handleCorrectCanal(nf.id, c) }}
                                    disabled={correctCanal.isPending}
                                    className={`px-2.5 py-1 rounded-lg font-sans text-xs font-semibold transition-all ${
                                      nf.canal === c ? 'bg-verde-vivid text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-verde-vivid'
                                    }`}
                                  >
                                    {CHANNEL_LABELS[c]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
