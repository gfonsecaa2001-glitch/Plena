# Plena — CRM para nutricionistas

🌐 **Em produção:** <https://plenacrm.vercel.app> (Vercel + Neon Postgres;
deploy automático a cada push na `main`)

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
- ✅ **Painel administrativo** — `/admin`, só para contas com `role = "admin"`; métricas de negócio (contas, cadastros, último acesso, uso agregado). Por design **não** expõe dados clínicos de pacientes. Promover alguém: `UPDATE "Nutritionist" SET role='admin' WHERE email='...'`
- ✅ **Google Agenda** — cada nutricionista conecta a própria conta em `/integracoes`; consultas viram eventos com lembrete, e mudanças de status atualizam o evento. Config: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (projeto `plena-crm` no Google Cloud). O app está em modo "Testando": novos nutricionistas precisam ser adicionados como usuários de teste até passar pela verificação do Google.
- ✅ **Link público de agendamento** — `/agendar/[slug]`, sem login; o paciente escolhe o horário, o paciente é criado/reaproveitado automaticamente e a consulta sincroniza com o Google Agenda. Config em `/agendamento` (dias, horários, duração, liga/desliga). Horário ocupado nunca é oferecido e é revalidado no servidor.
- ✅ **Cálculo nutricional** — tabela TACO (591 alimentos, `prisma/taco-foods.json`, carga com `npm run db:seed-foods`); TMB (Mifflin-St Jeor e Harris-Benedict) + GET na página do paciente; plano alimentar com macros por item/refeição/dia e barras vs. meta. Fórmulas e somatórios em `lib/nutrition.ts`. Planos no formato antigo (itens em texto puro) seguem funcionando — `lib/mealplan.ts` normaliza.
- ✅ **Meus alimentos** — `/alimentos`: receitas montadas a partir de ingredientes da TACO (com campo de rendimento, porque preparar muda o peso) ou valores digitados do rótulo. Privados por conta.
- ✅ **Substituições** — por item do plano, com quantidade calculada para igualar as calorias; saem na impressão que o paciente leva.
- ✅ **Importar pacientes por planilha** — `/pacientes/importar`: cola do Excel/Google Planilhas (TAB) ou arquivo `.csv` (vírgula ou ponto e vírgula, detectado sozinho). `lib/csv.ts` tem parser de CSV de verdade (campo entre aspas com vírgula, aspas escapadas, quebra de linha interna, CRLF) e mapeia o cabeçalho por sinônimos — "Nome Completo", "E-mail", "Celular", "Data de Nascimento" funcionam sem editar a planilha. Prévia obrigatória antes de gravar, usando **a mesma função** que o servidor reexecuta sobre o texto original. Linha sem nome é reportada e pulada; data ilegível ou inexistente (31/02) vira aviso e o paciente entra sem a data. Deduplicação por nome + telefone **ou** e-mail: reimportar a mesma planilha não duplica ninguém.
- ✅ **Anamnese estruturada** — alergias/restrições, condições de saúde, medicamentos, hábito intestinal, sono, água e histórico familiar em campos próprios (antes tudo era um parágrafo de texto livre que ninguém relê no meio da consulta). O campo de observações continua existindo para o resto.
- ✅ **Alerta de restrição no plano** — `lib/food-alert.ts` cruza as restrições do paciente com os alimentos do plano e avisa no editor, com marca no item e resumo no topo. Conhece grupos (lactose → leite, queijo, iogurte, requeijão…; glúten; amendoim/oleaginosas; frutos do mar; ovo; soja; vegetariano; vegano) e cai em busca literal para termos que não estão nos grupos. É **rede de segurança, não garantia**: não enxerga ingrediente dentro de preparação nem contaminação cruzada, não bloqueia nada, e não sai na impressão do paciente. Os testes cobrem os falsos positivos que tornariam o aviso ignorável ("ovo" dentro de "novo", "mel" dentro de "melancia").
- ✅ **Modelos de plano** — `/modelos`: salve um plano que ficou bom e reaproveite em qualquer paciente. Ao criar um plano dá para começar em branco, de um modelo, ou copiando outro plano do mesmo paciente; e um plano pode ser copiado direto para outro paciente. Tabela `PlanTemplate` **separada** do `MealPlan` de propósito — um modelo não pertence a paciente nenhum e não pode aparecer em histórico, link público ou estatística. Tudo é **cópia**: editar o resultado não mexe na origem, e excluir um modelo não afeta os planos que saíram dele. O link de compartilhamento nunca é copiado junto.
- ✅ **Link do plano para o paciente** — `/plano/[token]`, sem login: o paciente abre no celular e vê sempre a versão atual. Token de 256 bits (`lib/share.ts`), validade de 90 dias, `noindex` obrigatório (um link colado em página pública levaria o robô do Google até o plano) e botão para desligar. "Trocar por um link novo" **gera outro token** em vez de esticar o prazo — se o link vazou, prolongar a validade prolongaria o vazamento. Link inválido, plano apagado e link vencido mostram a mesma tela, para não confirmar que aquele endereço existiu.
- ✅ **Financeiro** — `/financeiro`: cobranças, recebido no mês, em aberto e vencidas. Valores em **centavos** (`lib/money.ts`) para a soma ser exata.
- ✅ **WhatsApp** — botão com a mensagem pronta na ficha do paciente, na agenda, no financeiro, no plano e nos alertas. Usa link `wa.me` (oficial e gratuito): quem aperta enviar é o nutricionista, do próprio número. `lib/whatsapp.ts` normaliza o telefone para `55DDDNÚMERO` e **não** mostra o botão quando o número não é confiável — abrir a conversa errada é pior que não ter botão.
- ✅ **Alertas de retenção** — `/alertas`: pacientes ativos há mais de 45 dias sem consulta e sem retorno marcado, consultas realizadas sem evolução escrita (obrigação do CRN), cobranças vencidas e lembretes dos próximos 7 dias. Cada linha já vem com a ação — na maioria, o WhatsApp pronto.
- ✅ **Perfil profissional** — `/perfil`: nome, CRN, consultório, telefone e cidade. Vão no cabeçalho e no rodapé do plano **impresso**, que sem isso não identifica quem prescreveu.
- ✅ **Dobras cutâneas** — `lib/skinfold.ts` com Pollock 7, Pollock 3 (pontos diferentes para homens e mulheres) e Faulkner 4, convertidos por Siri. O formulário mostra o percentual enquanto se digita, e o servidor **refaz a conta** antes de gravar. Resultado fora da faixa fisiológica (2–60%) é recusado — é como o sistema pega dobra anotada em cm.
- ✅ **LGPD** — exportação completa em JSON (`/api/pacientes/[id]/exportar`, art. 18 V) e exclusão definitiva com confirmação por digitação do nome (art. 18 VI). A rota de exportação devolve 401 sem sessão e 404 para paciente de outra conta.
- ✅ **Testes** — `npm test` (Vitest), 139 passando. Cobre nutrição, dobras cutâneas, agendamento, plano alimentar, datas/fuso, busca de alimentos, dinheiro e WhatsApp. `tests/isolamento.test.ts` precisa de `TEST_DATABASE_URL` (um branch do Neon) e fica pulado sem ela.
- ⬜ **Lembretes automáticos** — hoje o envio é manual (um clique). Automático exige a API oficial do WhatsApp Business, que é paga e pede aprovação da Meta.
- ⬜ **Billing** — Stripe, assinatura dos nutricionistas (diferente do financeiro acima, que é o caixa do consultório)
- ✅ **Postgres em produção + deploy** — Neon (região São Paulo) + Vercel, deploy automático a cada push na `main`
- ✅ **Histórico do acompanhamento** — modelo `Note` (evolução vinculada a consulta ou anotação avulsa), `Patient.status` (ativo/inativo/alta) e linha do tempo unificada na ficha do paciente (`app/pacientes/[id]/timeline.tsx`). Lista de pacientes filtra por situação; painel inicial considera só ativos.
- ✅ **Limite de tentativas** — `lib/rate-limit.ts` + modelo `RateLimit` (contador por janela no banco). Login: 8/e-mail e 25/IP a cada 15 min, aplicado **dentro do `authorize()`** em `auth.ts` (a rota `/api/auth/callback/credentials` é pública e ignoraria um limite posto só na server action). Cadastro: 5/IP por hora. Agendamento público: 5/IP e 20/agenda por hora.
