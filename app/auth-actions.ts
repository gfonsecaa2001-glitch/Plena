"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function loginAction(formData: FormData) {
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
