import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signupAction } from "@/app/auth-actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await auth()) redirect("/");

  const { erro } = await searchParams;

  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <div className="auth-brand-logo">
          Plena<span>.</span>
        </div>
        <h2>Comece em minutos, grátis.</h2>
        <p>
          Crie sua conta e organize seu consultório hoje: cadastro de pacientes,
          avaliações com gráficos de evolução, agenda e planos alimentares.
        </p>
        <ul>
          <li>Sem cartão de crédito</li>
          <li>Seus dados são só seus — isolados por conta</li>
          <li>Funciona no computador e no celular</li>
        </ul>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card">
          <div className="auth-logo">
            Plena<span>.</span>
          </div>
          <h1>Criar conta</h1>

          {erro === "existe" && <p className="auth-error">Já existe uma conta com esse e-mail.</p>}
          {erro === "dados" && (
            <p className="auth-error">Preencha todos os campos — a senha precisa de 8+ caracteres.</p>
          )}

          <form className="stack" action={signupAction}>
            <div className="field">
              <label htmlFor="name">Seu nome</label>
              <input id="name" name="name" required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Senha (mínimo 8 caracteres)</label>
              <input id="password" name="password" type="password" minLength={8} required />
            </div>
            <button className="btn" type="submit">
              Criar conta grátis
            </button>
          </form>

          <p className="auth-alt">
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
