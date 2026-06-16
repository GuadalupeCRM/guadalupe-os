# Guadalupe OS

Sistema operacional completo da Guadalupe — primeira tequila soda RTD do Brasil.

## Para rodar no PC

### 1. Instalar o Node.js (só uma vez)
Acesse: https://nodejs.org → clique em "Download LTS" → instale normalmente

### 2. Abrir o terminal dentro da pasta guadalupe-os

### 3. Instalar os pacotes
```
npm install
```

### 4. Preencher as credenciais
Abra o arquivo `.env.local` e preencha:
- `VITE_SUPABASE_ANON_KEY` — pegar em supabase.com → projeto → Settings → API → anon public

### 5. Rodar o projeto
```
npm run dev
```
Acesse: http://localhost:5173

## Próximos módulos
Use os prompts 06-19 no Claude Code para implementar cada módulo:
- Prompt 06: Financeiro (Caixa, DRE, CMV)
- Prompt 07: CRM (Leads, PDVs)
- Prompt 08: Eventos
- Prompt 09: Estoque
...
