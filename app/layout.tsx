import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
  const session = await auth();

  // Sem sessão (telas de login/cadastro): sem menu lateral.
  if (!session?.user) {
    return (
      <html lang="pt-BR">
        <body className={`${inter.variable} ${fraunces.variable}`}>{children}</body>
      </html>
    );
  }

  const initials = (session.user.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // O link "Administração" só aparece para contas admin. (A proteção de verdade
  // está no servidor, em lib/admin.ts — esconder o link é só conveniência.)
  const me = session.user.email
    ? await prisma.nutritionist.findUnique({
        where: { email: session.user.email },
        select: { role: true },
      })
    : null;

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
                <div className="sidebar-user-name">{session.user.name}</div>
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
