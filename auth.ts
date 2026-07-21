import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Configuração central do Auth.js.
// O fluxo: o formulário de login envia e-mail+senha → authorize() confere no
// banco → se ok, o Auth.js emite um cookie de sessão assinado (JWT) que
// identifica o usuário nas próximas requisições. A senha nunca fica guardada:
// só o hash bcrypt dela (uma "impressão digital" impossível de reverter).
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = credentials?.email?.toString().toLowerCase().trim();
        const password = credentials?.password?.toString();
        if (!email || !password) return null;

        const nutritionist = await prisma.nutritionist.findUnique({ where: { email } });
        if (!nutritionist?.passwordHash) return null;

        const valid = await bcrypt.compare(password, nutritionist.passwordHash);
        if (!valid) return null;

        return { id: nutritionist.id, name: nutritionist.name, email: nutritionist.email };
      },
    }),
  ],
});
