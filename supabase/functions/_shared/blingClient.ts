// ============================================================
// Bling v3 API client — auth + request helpers
// Docs: https://developer.bling.com.br/
// ============================================================

const BLING_API_URL = 'https://api.bling.com.br/Api/v3'
const BLING_TOKEN_URL = 'https://api.bling.com.br/Api/v3/oauth/token'

const BLING_CLIENT_ID = Deno.env.get('BLING_CLIENT_ID') ?? ''
const BLING_CLIENT_SECRET = Deno.env.get('BLING_CLIENT_SECRET') ?? ''

let cachedToken: { access_token: string; expires_at: number } | null = null

// ------------------------------------------------------------
// OAuth (client_credentials)
// ------------------------------------------------------------
export async function getBlingAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 30_000) {
    return cachedToken.access_token
  }

  const basicAuth = btoa(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`)

  const res = await fetch(BLING_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '1.0',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bling OAuth error (${res.status}): ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
  return cachedToken.access_token
}

// ------------------------------------------------------------
// Generic authenticated request
// ------------------------------------------------------------
export async function blingFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getBlingAccessToken()

  const res = await fetch(`${BLING_API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bling API error (${res.status}) on ${path}: ${text}`)
  }

  return res.json()
}

// ------------------------------------------------------------
// NF helpers
// ------------------------------------------------------------
export interface BlingNFItem {
  descricao: string
  codigo?: string
  quantidade: number
  valor: number
}

export interface BlingNFNormalized {
  bling_id: string
  nf_number: string
  client_cnpj: string | null
  client_name: string
  total_value: number
  issued_at: string
  status: string
  tipo: 'entrada' | 'saida' | string
  description: string
  items: BlingNFItem[]
}

// Fetch a page of NFEs (notas fiscais) within a date range.
export async function fetchBlingNFs(params: { dataEmissaoInicial: string; dataEmissaoFinal: string; pagina?: number }): Promise<unknown[]> {
  const search = new URLSearchParams({
    dataEmissaoInicial: params.dataEmissaoInicial,
    dataEmissaoFinal: params.dataEmissaoFinal,
    pagina: String(params.pagina ?? 1),
  })
  const data = await blingFetch(`/nfe?${search.toString()}`) as { data?: unknown[] }
  return data.data ?? []
}

// Fetch full details for a single NFE.
export async function fetchBlingNFDetails(blingId: string): Promise<unknown> {
  const data = await blingFetch(`/nfe/${blingId}`) as { data?: unknown }
  return data.data
}

// Normalize a raw Bling v3 NFE payload (webhook or REST) into our shape.
export function normalizeBlingNF(raw: any): BlingNFNormalized {
  const contato = raw?.contato ?? raw?.destinatario ?? {}
  const itens = (raw?.itens ?? raw?.items ?? []) as any[]

  return {
    bling_id: String(raw?.id ?? raw?.idNotaFiscal ?? ''),
    nf_number: String(raw?.numero ?? raw?.numeroNF ?? ''),
    client_cnpj: (contato?.numeroDocumento ?? contato?.cnpj ?? contato?.cpfCnpj ?? null)?.replace(/\D/g, '') || null,
    client_name: contato?.nome ?? raw?.cliente ?? 'Desconhecido',
    total_value: Number(raw?.valorNota ?? raw?.valor ?? raw?.total ?? 0),
    issued_at: raw?.dataEmissao ?? raw?.data ?? new Date().toISOString().slice(0, 10),
    status: String(raw?.situacao?.valor ?? raw?.situacao ?? raw?.status ?? 'desconhecido'),
    tipo: raw?.tipo === 0 || raw?.tipo === 'E' ? 'entrada' : 'saida',
    description: raw?.observacoes ?? raw?.descricao ?? '',
    items: itens.map((it) => ({
      descricao: it?.descricao ?? it?.descricaoItem ?? '',
      codigo: it?.codigo,
      quantidade: Number(it?.quantidade ?? 0),
      valor: Number(it?.valor ?? it?.valorUnitario ?? 0),
    })),
  }
}
