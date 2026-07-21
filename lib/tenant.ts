import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "./prisma";

// A promessa do dia 1, cumprida: esta função agora lê a sessão do usuário
// logado. Como TODA consulta do app já filtrava por nutritionistId, trocar o
// "nutricionista demo" pelo usuário real transformou o sistema em multi-usuário
// sem mudar mais nada.
//
// Ela também funciona como o "porteiro" do app: qualquer página que precisa de
// dados chama esta função — e quem não está logado é mandado pro /login.
export async function getCurrentNutritionist() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const nutritionist = await prisma.nutritionist.findUnique({
    where: { email: session.user.email },
  });
  if (!nutritionist) redirect("/login");

  return nutritionist;
}
