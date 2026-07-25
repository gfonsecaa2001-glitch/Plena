import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "./prisma";

// `cache()` do React memoriza o resultado DENTRO de uma mesma requisição.
//
// Por que importa: o layout precisa saber quem está logado (para o menu e o
// avatar) e a página também (para buscar os dados). Sem isso, cada navegação
// decodificava o cookie de sessão e consultava o banco DUAS vezes. Agora a
// segunda chamada reaproveita o resultado da primeira — sem cache entre
// usuários ou entre requisições, então não há risco de vazar dado de um
// nutricionista para outro.
export const getCurrentNutritionistOrNull = cache(async () => {
  const session = await auth();
  if (!session?.user?.email) return null;

  return prisma.nutritionist.findUnique({ where: { email: session.user.email } });
});

// A promessa do dia 1, cumprida: esta função lê a sessão do usuário logado.
// Como TODA consulta do app já filtrava por nutritionistId, trocar o
// "nutricionista demo" pelo usuário real transformou o sistema em multi-usuário
// sem mudar mais nada.
//
// Ela também é o "porteiro": quem não está logado é mandado pro /login.
// Repare que não basta existir um cookie: a conta precisa existir no banco —
// um cookie pode sobreviver à exclusão da conta.
export async function getCurrentNutritionist() {
  const nutritionist = await getCurrentNutritionistOrNull();
  if (!nutritionist) redirect("/login");
  return nutritionist;
}
