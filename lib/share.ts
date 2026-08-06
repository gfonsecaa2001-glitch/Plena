// Links secretos para o paciente ver o plano sem login.
//
// PREMISSA DE SEGURANÇA: o endereço secreto não é senha. Quem receber o link
// vê o plano — e ele vai circular por WhatsApp, onde é encaminhado sem pensar.
// Por isso o sistema trata o link como algo temporário e revogável, não como
// um segredo permanente.

import { randomBytes } from "node:crypto";

// 32 bytes = 256 bits de aleatoriedade real (randomBytes é criptográfico,
// diferente de Math.random). Chutar um token desses é inviável mesmo com o
// endereço em mãos — o que sobra como risco é o link vazar, não ser adivinhado.
//
// base64url em vez de hex: mesma força com um endereço bem mais curto, e sem
// os caracteres "+/=" que quebram numa URL.
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

// Validade padrão. 90 dias cobre um ciclo de acompanhamento inteiro sem
// obrigar o nutricionista a renovar toda semana.
export const DIAS_DE_VALIDADE = 90;

export function defaultExpiry(from: Date): Date {
  return new Date(from.getTime() + DIAS_DE_VALIDADE * 86400000);
}

// Um link só vale se existir E não tiver vencido. As duas condições juntas
// num lugar só, para nenhuma tela esquecer metade da regra.
export function isShareActive(
  token: string | null | undefined,
  expiresAt: Date | null | undefined,
  now: Date
): boolean {
  if (!token) return false;
  if (!expiresAt) return true; // sem prazo definido = não expira
  return expiresAt.getTime() > now.getTime();
}

// Endereço completo, para copiar e mandar no WhatsApp.
//
// A rota é parâmetro porque já existe mais de um tipo de link para o paciente
// (o plano e o recordatório). Deixá-la fixa em "plano" fez o link do
// recordatório apontar para a página errada.
export type RotaPublica = "plano" | "recordatorio";

export function shareUrl(token: string, baseUrl: string, rota: RotaPublica = "plano"): string {
  return `${baseUrl.replace(/\/+$/, "")}/${rota}/${token}`;
}

// URL pública do sistema, montada do ambiente. Em produção a Vercel fornece
// o domínio; em desenvolvimento cai no localhost da porta do projeto.
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3001")
  );
}
