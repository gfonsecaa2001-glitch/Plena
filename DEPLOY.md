# Colocando o NutriCRM no ar

O caminho: **GitHub** (guarda o código) → **Neon** (banco Postgres) → **Vercel**
(roda o app). Todos têm plano gratuito suficiente pro início.

## 1. GitHub — subir o código

1. Crie a conta em <https://github.com/signup> (se ainda não tiver).
2. Crie um repositório em <https://github.com/new> — nome `nutricrm`, **privado**,
   sem README (o projeto já tem).
3. No terminal, dentro da pasta do projeto:

```bash
git remote add origin https://github.com/SEU_USUARIO/nutricrm.git
git push -u origin main
```

## 2. Neon — o banco Postgres

1. Crie a conta em <https://neon.tech> (dá pra entrar com a conta do GitHub).
2. Crie um projeto (ex.: `nutricrm`, região `aws-sa-east-1` / São Paulo).
3. Copie a **connection string** (começa com `postgresql://...`).

## 3. Trocar o banco local pro Postgres

No projeto:

1. Em `prisma/schema.prisma`, troque `provider = "sqlite"` por `provider = "postgresql"`.
2. No `.env`, troque o `DATABASE_URL` pela connection string do Neon.
3. Rode `npx prisma db push` — cria as tabelas no Neon.
4. Confirme com `npm run dev` que tudo funciona (o banco começa vazio: crie sua
   conta de novo pelo /cadastro).
5. Commit: `git add -A && git commit -m "Postgres" && git push`

> O dado local (Maria etc.) era descartável; recomeçar do zero no Postgres é ok.

## 4. Vercel — o app no ar

1. Crie a conta em <https://vercel.com/signup> entrando **com o GitHub**.
2. "Add New → Project" → importe o repositório `nutricrm`.
3. Antes de clicar em Deploy, abra **Environment Variables** e adicione:
   - `DATABASE_URL` = a connection string do Neon
   - `AUTH_SECRET` = um segredo novo (gere com `openssl rand -base64 32`)
4. Deploy. Em ~2 min o app estará em `https://nutricrm-....vercel.app`.

## Depois do primeiro deploy

- Cada `git push` na branch `main` = deploy automático.
- Domínio próprio (ex.: `nutricrm.com.br`): compra no Registro.br e aponta na
  aba Domains da Vercel.
- O plano grátis da Vercel não permite uso comercial contínuo — quando houver
  clientes pagando, o plano Pro (~US$ 20/mês) resolve.
