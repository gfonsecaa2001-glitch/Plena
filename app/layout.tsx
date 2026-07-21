import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/auth-actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriCRM",
  description: "CRM para nutricionistas",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Sem sessão (telas de login/cadastro): sem menu lateral.
  if (!session?.user) {
    return (
      <html lang="pt-BR">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="logo">
              Nutri<span>CRM</span>
            </div>
            <Link className="nav-item" href="/">
              Início
            </Link>
            <Link className="nav-item" href="/pacientes">
              Pacientes
            </Link>
            <Link className="nav-item" href="/agenda">
              Agenda
            </Link>
            <Link className="nav-item" href="/planos">
              Planos alimentares
            </Link>
            <div className="soon">
              Financeiro<small>em breve</small>
            </div>

            <div className="sidebar-user">
              <div className="sidebar-user-name">{session.user.name}</div>
              <form action={logoutAction}>
                <button className="sidebar-logout" type="submit">
                  Sair
                </button>
              </form>
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
