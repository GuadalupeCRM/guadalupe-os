# Guadalupe OS — Checklist Go Live

## Infraestrutura
- [ ] CLAUDE.md existe na raiz do repositório
- [ ] Todas as variáveis de app_settings preenchidas no Supabase (bling, brevo, instagram, shopify)
- [ ] RLS testada para todos os roles (admin, comercial, marketing, eventos, financeiro, vendedor)

## Integrações
- [ ] URL do webhook Bling registrada no painel Bling: `https://szcaggkwvtghgravfqrs.supabase.co/functions/v1/bling-webhook`
- [ ] Shopify webhook configurado (secret obtido e salvo em app_settings)
- [ ] Brevo API conectada (list_id=9, já funcional)
- [ ] Instagram access token adicionado (token EAA... obtido via developers.facebook.com)
- [ ] Google Search Console service account — **pausado por Raphael (policy de organização)**

## PWA
- [ ] Converter `public/icon-source.svg` em `icon-192.png` e `icon-512.png`
  - Usar qualquer conversor online: svgtopng.com ou similiares
  - Salvar ambos na pasta `/public` do repositório
- [ ] PWA instalada no celular do Raphael (abrir o site no Chrome → menu → "Adicionar à tela inicial")
- [ ] PWA instalada no celular do Roberto

## Agentes (pg_cron)
- [ ] Job cron criado para agent-dre-generator (sugestão: todo dia 1 às 8h)
- [ ] Job cron criado para demais agentes conforme documentação

## Usuários
- [x] Raphael criado como admin
- [x] Fabinho criado como comercial
- [ ] Adriana convidada como financeiro
- [ ] Murilo convidado como marketing
- [ ] Roberto convidado como eventos

## Deploy
- [ ] Variáveis de ambiente confirmadas no painel Netlify
- [ ] Build passing em produção (guadalupe-os-app.netlify.app)
- [ ] Testar login em iOS Safari e Android Chrome
