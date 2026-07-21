import Link from "next/link";
import { signupAction } from "@/app/auth-actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          Plena<span>.</span>
        </div>
        <h1>Criar conta</h1>
        <p className="muted" style={{ marginTop: -6, fontSize: 14 }}>
          Seu consultório organizado em minutos.
        </p>

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
            Criar conta
          </button>
        </form>

        <p className="auth-alt">
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
