import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentNutritionistOrNull } from "@/lib/tenant";
import { loginAction } from "@/app/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  // Quem já está logado (com conta existente) vai direto pro início.
  if (await getCurrentNutritionistOrNull()) redirect("/");

  const { erro } = await searchParams;

  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <div className="auth-brand-logo">
          Plena<span>.</span>
        </div>
        <h2>Seu consultório de nutrição, pleno.</h2>
        <p>
          Pacientes, avaliações, agenda e planos alimentares — tudo organizado num só
          lugar, pra você cuidar do que importa: as pessoas.
        </p>
        <ul>
          <li>Prontuário e evolução com gráficos</li>
          <li>Planos alimentares prontos pra imprimir</li>
          <li>Agenda com status de cada consulta</li>
        </ul>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card">
          <div className="auth-logo">
            Plena<span>.</span>
          </div>
          <h1>Bem-vindo de volta</h1>

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
      </main>
    </div>
  );
}
