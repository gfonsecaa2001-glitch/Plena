import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp, primeiroBloqueio } from "@/lib/rate-limit";

const QUINZE_MIN = 15 * 60 * 1000;

// Configuração central do Auth.js.
// O fluxo: o formulário de login envia e-mail+senha → authorize() confere no
// banco → se ok, o Auth.js emite um cookie de sessão assinado (JWT) que
// identifica o usuário nas próximas requisições. A senha nunca fica guardada:
// só o hash bcrypt dela (uma "impressão digital" impossível de reverter).
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  events: {
    // Registra o último acesso — é o que permite ver no painel admin
    // quem realmente está usando o sistema (e quem sumiu).
    async signIn({ user }) {
      if (!user?.email) return;
      await prisma.nutritionist
        .update({ where: { email: user.email }, data: { lastLoginAt: new Date() } })
        .catch(() => {}); // nunca deixar o login falhar por causa disso
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = credentials?.email?.toString().toLowerCase().trim();
        const password = credentials?.password?.toString();
        if (!email || !password) return null;

        // O limite de tentativas mora AQUI, e não só no formulário: esta
        // função é o único caminho por onde toda tentativa de login passa,
        // inclusive quem chama a rota da API diretamente, sem usar a tela.
        const ip = await clientIp();
        const bloqueado = primeiroBloqueio(
          await checkRateLimit(`login:email:${email}`, 8, QUINZE_MIN),
          await checkRateLimit(`login:ip:${ip}`, 25, QUINZE_MIN)
        );
        if (bloqueado) return null;

        const nutritionist = await prisma.nutritionist.findUnique({ where: { email } });
        if (!nutritionist?.passwordHash) return null;

        const valid = await bcrypt.compare(password, nutritionist.passwordHash);
        if (!valid) return null;

        return { id: nutritionist.id, name: nutritionist.name, email: nutritionist.email };
      },
    }),
  ],
});
