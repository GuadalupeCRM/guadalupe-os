# CLAUDE.md — Guadalupe OS

## What This Project Is
Guadalupe OS is the complete business operating system for Guadalupe — Brazil's first RTD (ready-to-drink) tequila soda brand. 310ml cans, 7% ABV. Three SKUs: Mango Sour, Margarita Lime, Paloma Grapefruit. Target: urban women 25-35.

## Tech Stack (NEVER change without explicit instruction)
- Frontend: Vite + React 18 + TypeScript + Tailwind CSS v3
- Router: React Router v6 | Server state: TanStack Query v5 | UI state: Zustand
- Forms: React Hook Form v7 + Zod | Charts: Recharts v2 | Icons: Lucide React
- Backend: Supabase | ERP: Bling v3 API | Email: Brevo | AI: Anthropic Claude API

## Supabase Project
- URL: https://szcaggkwvtghgravfqrs.supabase.co
- Ref: szcaggkwvtghgravfqrs

## Design System — IDV Clean Era (MANDATORY)
Colors: verde(#6BB42E/#A2C96C/#E6F0D7), rosa(#E21655/#F18EA0/#FBE4EA), amarelo(#FAAE1A/#FED873/#FEEDC1), areia(#FFFBF0/#F1EFE9)
Typography: DM Serif Display (H1/H2/KPIs), Barlow Condensed (everything else)

## Business Constants
CMV: Mango Sour R$3,82 | Margarita Lime R$3,93 | Paloma Grapefruit R$4,02
Breakeven: R$24.000/mês | Custos fixos: R$12.000 | Alerta caixa: R$8.000

## Roles
admin(Raphael) | marketing(Murilo) | eventos(Roberto) | financeiro(Adriana)

## Current State
Base project created. Modules to implement via prompts 06-19.
Priority next: Prompt 06 (Financeiro) → Prompt 07 (CRM) → Prompt 08 (Eventos)
