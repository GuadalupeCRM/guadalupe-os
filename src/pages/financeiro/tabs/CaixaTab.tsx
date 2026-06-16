import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Plus, Bot } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import { CASH_MINIMUM_ALERT } from '../../../constants/business'
import { useCashFlow, useCreateCashEntry } from '../../../hooks/useFinanceiro'
import type { CashEntryCategory } from '../../../types'

const CATEGORY_LABELS: Record<CashEntryCategory, string> = {
  vendas: 'Vendas',
  custos: 'Custos',
  fixos: 'Fixos',
  outros: 'Outros',
}

const entrySchema = z.object({
  date: z.string().min(1, 'Informe a data'),
  type: z.enum(['entrada', 'saida']),
  category: z.enum(['vendas', 'custos', 'fixos', 'outros']),
  value: z.coerce.number().positive('Valor deve ser maior que zero'),
  description: z.string().optional(),
})

type EntryForm = z.infer<typeof entrySchema>

function balanceColor(balance: number): string {
  if (balance > 12000) return 'text-verde-vivid'
  if (balance >= 8000) return 'text-amarelo-vivid'
  return 'text-rosa-vivid'
}

function LancamentoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      type: 'entrada',
      category: 'vendas',
      value: undefined as unknown as number,
      description: '',
    },
  })
  const createEntry = useCreateCashEntry()

  const onSubmit = async (values: EntryForm) => {
    try {
      await createEntry.mutateAsync(values)
      toast.success('Lançamento registrado')
      reset()
      onClose()
    } catch {
      toast.error('Erro ao registrar lançamento')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Lançamento">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Data</label>
          <input type="date" {...register('date')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.date && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.date.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Tipo</label>
            <select {...register('type')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Categoria</label>
            <select {...register('category')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Valor (R$)</label>
          <input type="number" step="0.01" {...register('value')} className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
          {errors.value && <p className="text-rosa-vivid text-xs font-sans mt-1">{errors.value.message}</p>}
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold text-gray-500 mb-1">Descrição</label>
          <input type="text" {...register('description')} placeholder="Opcional" className="w-full border border-areia-warm rounded-lg px-3 py-2 font-sans text-sm focus:outline-none focus:border-verde-vivid" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold text-gray-500 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg font-sans text-sm font-semibold bg-verde-vivid text-white hover:bg-verde-mid disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function CaixaTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data, isLoading } = useCashFlow()

  if (isLoading || !data) {
    return <p className="font-sans text-sm text-gray-400">Carregando dados de caixa...</p>
  }

  const { currentBalance, last30, last10, monthly } = data
  const isLowBalance = currentBalance < CASH_MINIMUM_ALERT
  const variacaoPositiva = monthly.variacaoPct === null ? null : monthly.variacaoPct >= 0

  return (
    <div className="space-y-5">
      {/* Alerta de caixa baixo */}
      {isLowBalance && (
        <div className="bg-rosa-pale border border-rosa-vivid rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-rosa-vivid flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-sans font-bold text-sm text-rosa-vivid">Caixa abaixo do mínimo de segurança</p>
            <p className="font-sans text-sm text-gray-600 mt-0.5">
              O saldo atual ({formatCurrency(currentBalance)}) está abaixo do limite de {formatCurrency(CASH_MINIMUM_ALERT)}. Ação recomendada.
            </p>
          </div>
          <button
            onClick={() => toast('Agente financeiro acionado — em breve disponível', { icon: '🤖' })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-sans font-semibold text-xs bg-rosa-vivid text-white hover:bg-rosa-mid flex-shrink-0"
          >
            <Bot size={14} /> Acionar agente financeiro
          </button>
        </div>
      )}

      {/* Saldo atual */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Saldo Atual de Caixa</p>
          <p className={`font-serif text-5xl ${balanceColor(currentBalance)}`}>{formatCurrency(currentBalance)}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans font-semibold text-sm bg-verde-vivid text-white hover:bg-verde-mid"
        >
          <Plus size={16} /> Lançamento
        </button>
      </div>

      {/* Resumo mensal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Entradas</p>
          <p className="font-serif text-2xl text-verde-vivid">{formatCurrency(monthly.totalEntradas)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Saídas</p>
          <p className="font-serif text-2xl text-rosa-vivid">{formatCurrency(monthly.totalSaidas)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-gray-400 mb-1">Saldo Líquido</p>
          <p className={`font-serif text-2xl ${monthly.saldoLiquido >= 0 ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
            {formatCurrency(monthly.saldoLiquido)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-gray-400 mb-1">vs Mês Anterior</p>
          <div className="flex items-center gap-1.5">
            {variacaoPositiva === null ? (
              <p className="font-serif text-2xl text-gray-400">—</p>
            ) : (
              <>
                {variacaoPositiva
                  ? <ArrowUpRight size={20} className="text-verde-vivid" />
                  : <ArrowDownRight size={20} className="text-rosa-vivid" />}
                <p className={`font-serif text-2xl ${variacaoPositiva ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
                  {Math.abs(monthly.variacaoPct ?? 0).toFixed(1)}%
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico 30 dias */}
      <div className="bg-areia border border-gray-200 rounded-xl p-5">
        <p className="font-sans font-semibold text-sm text-gray-700 mb-3">Evolução do Saldo — Últimos 30 dias</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={last30}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE9" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatDate(d).slice(0, 5)}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
            />
            <YAxis
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              width={50}
            />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              labelFormatter={(d) => formatDate(d)}
              contentStyle={{ borderRadius: 8, border: '1px solid #E6F0D7', fontSize: 12 }}
            />
            <Line type="monotone" dataKey="balance" stroke="#6BB42E" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Últimos lançamentos */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="font-sans font-semibold text-sm text-gray-700">Últimos Lançamentos</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5">Data</th>
                <th className="px-5 py-2.5">Descrição</th>
                <th className="px-5 py-2.5">Tipo</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
                <th className="px-5 py-2.5 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {last10.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Nenhum lançamento registrado.</td></tr>
              ) : last10.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-500">{formatDate(e.date)}</td>
                  <td className="px-5 py-2.5 text-gray-800">{e.description || '—'}</td>
                  <td className="px-5 py-2.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      e.type === 'entrada' ? 'bg-verde-pale text-verde-vivid' : 'bg-rosa-pale text-rosa-vivid'
                    }`}>
                      {e.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`px-5 py-2.5 text-right font-semibold ${e.type === 'entrada' ? 'text-verde-vivid' : 'text-rosa-vivid'}`}>
                    {e.type === 'entrada' ? '+' : '-'}{formatCurrency(Number(e.value))}
                  </td>
                  <td className="px-5 py-2.5 text-right text-gray-700">{formatCurrency(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LancamentoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
