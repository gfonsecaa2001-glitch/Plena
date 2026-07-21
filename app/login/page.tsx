import Link from "next/link";
import { loginAction } from "@/app/auth-actions";

export default async function LoginPage({
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
        <h1>Entrar</h1>

        {erro && <p className="auth-error">E-mail ou senha incorretos.</p>}

        <form className="stack" action={loginAction}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button className="btn" type="submit">
            Entrar
          </button>
        </form>

        <p className="auth-alt">
          Ainda não tem conta? <Link href="/cadastro">Cadastre-se grátis</Link>
        </p>
      </div>
    </div>
  );
}
