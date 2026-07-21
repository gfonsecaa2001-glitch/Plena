# Plena — CRM para nutricionistas

SaaS de gestão de consultório para nutricionistas (nome de produto: **Plena**;
a pasta e o repositório mantêm o nome técnico `nutricrm`). Multi-tenant: todo
dado é filtrado por `nutritionistId`.

Identidade visual: "verde orgânico sofisticado" — tokens em `app/globals.css`
(oliva `#4a6b35`, marfim `#f5f4ec`, títulos em serifa). Cores de gráfico
validadas p/ daltonismo: `#345c1f` / `#c9803f`.

## Rodando

```bash
npm install
npx prisma db push   # cria/atualiza o banco (SQLite em prisma/dev.db)
npm run dev          # abre em http://localhost:3001
```

## Stack e arquitetura

| Camada | Tecnologia | Onde |
| --- | --- | --- |
| Front + back | Next.js 15 (App Router, Server Components) | `app/` |
| Banco | SQLite via Prisma (trocar por Postgres em produção) | `prisma/schema.prisma` |
| Escrita de dados | Server Actions | `app/actions.ts` |
| Autenticação | Auth.js v5 (Credentials + JWT), config em `auth.ts` | `lib/tenant.ts` lê a sessão e faz o gate de login |

`lib/tenant.ts` é o ponto-chave: quando entrar autenticação, só essa função muda.

## Módulos

- ✅ **Pacientes** — cadastro, anamnese, busca, página de detalhe
- ✅ **Avaliações antropométricas** — peso, altura, % gordura, medidas; IMC automático
- ✅ **Agenda** — agendamento por paciente, status (realizada/faltou), histórico
- ✅ **Planos alimentares** — refeições com horários e alimentos; listagem geral em `/planos`; impressão/PDF via navegador (`@media print`)
- ✅ **Gráficos de evolução** — peso, % gordura e medidas na página do paciente; SVG próprio, sem lib externa (`app/pacientes/[id]/line-chart.tsx`), paleta validada p/ daltonismo
- ✅ **Autenticação** — Auth.js v5 com e-mail/senha (bcrypt); cadastro em `/cadastro`, login em `/login`; isolamento por conta em todas as consultas e ações (conta demo: `demo@nutricrm.app` / `demo1234`)
- ⬜ **Lembretes de consulta** (WhatsApp/e-mail)
- ⬜ **Billing** — Stripe, planos de assinatura
- ⬜ **Postgres em produção** + deploy (Vercel + Neon/Supabase)
