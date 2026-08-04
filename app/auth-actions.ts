"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  peekRateLimit,
  clientIp,
  limparAntigos,
  primeiroBloqueio,
} from "@/lib/rate-limit";

const QUINZE_MIN = 15 * 60 * 1000;
const UMA_HORA = 60 * 60 * 1000;

export async function loginAction(formData: FormData) {
  const email = formData.get("email")?.toString().toLowerCase().trim() ?? "";
  const ip = await clientIp();

  // Aqui só CONSULTAMOS, para dar uma mensagem clara ao usuário. Quem conta
  // de fato é o authorize() em auth.ts — é por lá que passa toda tentativa,
  // inclusive as que ignoram esta tela.
  //  • por e-mail  → impede insistir na senha de UMA conta específica
  //  • por IP      → impede varrer várias contas a partir da mesma origem
  const porEmail = await peekRateLimit(`login:email:${email}`, 8, QUINZE_MIN);
  const porIp = await peekRateLimit(`login:ip:${ip}`, 25, QUINZE_MIN);
  void limparAntigos(QUINZE_MIN);

  const bloqueio = primeiroBloqueio(porEmail, porIp);
  if (bloqueio) redirect(`/login?erro=limite&min=${bloqueio.retryAfterMin}`);

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    // Senha errada → AuthError → volta pro login com aviso.
    if (error instanceof AuthError) redirect("/login?erro=1");
    // Qualquer outra coisa (inclusive o "redirect" interno do Next em caso de
    // sucesso, que funciona lançando uma exceção especial) segue o fluxo normal.
    throw error;
  }
}

export async function signupAction(formData: FormData) {
  // Sem limite, um robô criaria centenas de contas a partir da mesma origem.
  const ip = await clientIp();
  const limite = await checkRateLimit(`signup:ip:${ip}`, 5, UMA_HORA);
  void limparAntigos(UMA_HORA);
  if (!limite.ok) redirect(`/cadastro?erro=limite&min=${limite.retryAfterMin}`);

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().toLowerCase().trim();
  const password = formData.get("password")?.toString();

  if (!name || !email || !password || password.length < 8) {
    redirect("/cadastro?erro=dados");
  }

  const existing = await prisma.nutritionist.findUnique({ where: { email } });
  if (existing) redirect("/cadastro?erro=existe");

  await prisma.nutritionist.create({
    data: {
      name,
      email,
      // O "hash" é uma impressão digital da senha: dá pra conferir se uma senha
      // bate com ele, mas não dá pra descobrir a senha a partir dele.
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  // Cadastrou → já entra direto.
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
