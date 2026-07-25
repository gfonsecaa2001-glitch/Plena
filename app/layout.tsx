import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, Inter } from "next/font/google";
import { getCurrentNutritionistOrNull } from "@/lib/tenant";
import { logoutAction } from "@/app/auth-actions";
import { SidebarNav } from "./nav";
import "./globals.css";

// Fontes profissionais, servidas pelo próprio app (next/font baixa no build):
// Fraunces (serifa com personalidade) pros títulos, Inter pro texto.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Plena — CRM para nutricionistas",
  description: "Seu consultório de nutrição, organizado e pleno.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Páginas públicas (link de agendamento) nunca mostram o menu do sistema —
  // quem as vê é o paciente, não o nutricionista.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPublicPage = pathname.startsWith("/agendar");

  // Uma única chamada por requisição, compartilhada com a página (React cache).
  const me = isPublicPage ? null : await getCurrentNutritionistOrNull();

  // Sem sessão (login/cadastro) ou página pública: sem menu lateral.
  if (!me) {
    return (
      <html lang="pt-BR">
        <body className={`${inter.variable} ${fraunces.variable}`}>{children}</body>
      </html>
    );
  }

  const initials = me.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${fraunces.variable}`}>
        <div className="shell">
          <aside className="sidebar">
            <div className="logo">
              Plena<span>.</span>
            </div>
            <SidebarNav isAdmin={me?.role === "admin"} />

            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{me.name}</div>
                <form action={logoutAction}>
                  <button className="sidebar-logout" type="submit">
                    Sair
                  </button>
                </form>
              </div>
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
