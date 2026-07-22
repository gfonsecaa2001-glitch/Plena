import { redirect } from "next/navigation";
import { getCurrentNutritionist } from "./tenant";

// Porteiro do painel administrativo. Mesma ideia do getCurrentNutritionist,
// só que exige também que a conta tenha role "admin".
//
// IMPORTANTE: a checagem é feita aqui, no servidor. Esconder o link no menu
// não protege nada — quem souber a URL /admin tentaria entrar direto.
export async function requireAdmin() {
  const nutritionist = await getCurrentNutritionist();
  if (nutritionist.role !== "admin") redirect("/");
  return nutritionist;
}
