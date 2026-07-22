import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "./prisma";

// Retorna o nutricionista logado, ou null se não houver sessão válida.
//
// Repare que não basta existir um cookie de sessão: a conta precisa existir de
// verdade no banco. Um cookie pode sobreviver à exclusão da conta — e se
// confiássemos só nele, o usuário ficaria preso num vai-e-vem entre / e /login.
export async function getCurrentNutritionistOrNull() {
  const session = await auth();
  if (!session?.user?.email) return null;

  return prisma.nutritionist.findUnique({ where: { email: session.user.email } });
}

// A promessa do dia 1, cumprida: esta função lê a sessão do usuário logado.
// Como TODA consulta do app já filtrava por nutritionistId, trocar o
// "nutricionista demo" pelo usuário real transformou o sistema em multi-usuário
// sem mudar mais nada.
//
// Ela também é o "porteiro": quem não está logado é mandado pro /login.
export async function getCurrentNutritionist() {
  const nutritionist = await getCurrentNutritionistOrNull();
  if (!nutritionist) redirect("/login");
  return nutritionist;
}
