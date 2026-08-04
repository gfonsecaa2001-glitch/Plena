import { headers } from "next/headers";
import { prisma } from "./prisma";

// Limite de tentativas nos pontos abertos do sistema.
//
// COMO FUNCIONA: para cada chave (um IP, um e-mail) contamos quantas
// tentativas houve dentro de uma janela de tempo. Passou do limite, recusa —
// até a janela expirar e o contador zerar.
//
// DECISÃO IMPORTANTE: se o banco falhar, a função LIBERA a tentativa em vez de
// bloquear. É uma escolha consciente: um problema no banco não pode impedir um
// paciente de agendar nem um nutricionista de entrar. O limite é proteção
// contra abuso, não uma trava de segurança essencial — as verdadeiras (senha,
// isolamento por conta) continuam valendo de qualquer forma.

export type Bloqueio = { ok: false; retryAfterMin: number };
export type LimitResult = { ok: true } | Bloqueio;

// Devolve o primeiro limite estourado, se houver. Existe para o TypeScript
// conseguir estreitar o tipo — comparar vários resultados num ternário não
// deixa claro para ele qual deles está bloqueado.
export function primeiroBloqueio(...resultados: LimitResult[]): Bloqueio | undefined {
  return resultados.find((r): r is Bloqueio => !r.ok);
}

// Conta a tentativa e diz se ela pode prosseguir.
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<LimitResult> {
  const agora = new Date();
  const inicioDaJanela = new Date(agora.getTime() - windowMs);

  try {
    const atual = await prisma.rateLimit.findUnique({ where: { key } });

    // Sem registro, ou janela já expirada: começa a contar do zero.
    if (!atual || atual.windowAt < inicioDaJanela) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowAt: agora },
        update: { count: 1, windowAt: agora },
      });
      return { ok: true };
    }

    if (atual.count >= max) return bloqueio(atual.windowAt, windowMs, agora);

    await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { ok: true };
  } catch {
    return { ok: true }; // ver decisão acima
  }
}

// Só CONSULTA o contador, sem incrementar.
//
// Usado pelo formulário apenas para mostrar uma mensagem clara ("aguarde X
// minutos"). Quem realmente conta é o authorize() do Auth.js — se as duas
// pontas contassem, cada tentativa valeria por duas e o limite cairia pela
// metade.
export async function peekRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<LimitResult> {
  const agora = new Date();
  try {
    const atual = await prisma.rateLimit.findUnique({ where: { key } });
    if (!atual || atual.windowAt < new Date(agora.getTime() - windowMs)) return { ok: true };
    if (atual.count >= max) return bloqueio(atual.windowAt, windowMs, agora);
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

function bloqueio(windowAt: Date, windowMs: number, agora: Date): Bloqueio {
  const restaMs = windowAt.getTime() + windowMs - agora.getTime();
  return { ok: false, retryAfterMin: Math.max(1, Math.ceil(restaMs / 60000)) };
}

// IP de quem fez a requisição. Atrás da rede da Vercel o IP real vem no
// cabeçalho x-forwarded-for (o primeiro da lista).
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "desconhecido";
}

// Remove janelas velhas de vez em quando, para a tabela não crescer sem fim.
// Roda em ~2% das chamadas: barato e suficiente.
export async function limparAntigos(windowMs: number) {
  if (Math.random() > 0.02) return;
  try {
    await prisma.rateLimit.deleteMany({
      where: { windowAt: { lt: new Date(Date.now() - windowMs * 4) } },
    });
  } catch {
    /* limpeza é oportunista; falhar aqui não afeta nada */
  }
}
