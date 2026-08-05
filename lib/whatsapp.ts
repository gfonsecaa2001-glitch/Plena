// Envio de mensagens pelo WhatsApp — sem API paga e sem integração.
//
// O link wa.me é oficial e gratuito: abre a conversa com o número já escolhido
// e o texto já digitado. Quem aperta "enviar" é o nutricionista, do próprio
// aparelho. Isso evita o custo e a burocracia da API oficial do WhatsApp
// Business, e mantém a conversa no número que o paciente já conhece.

import { formatDate, formatDateTime, formatTime } from "./datetime";

// Normaliza um telefone brasileiro para o formato que o wa.me exige:
// só dígitos, com o código do país (55) na frente.
//
// Aceita o que o nutricionista realmente digita: "(11) 98765-4321",
// "11987654321", "+55 11 98765-4321". Devolve null quando não dá para
// confiar no número — melhor não oferecer o botão do que abrir a conversa
// errada com outra pessoa.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");

  // Zeros de operadora/DDD no começo ("011 98765-4321", "0 11 ...").
  digits = digits.replace(/^0+/, "");

  // Já veio com o código do país.
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // 10 dígitos = DDD + fixo; 11 = DDD + celular (com o 9 na frente).
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return null;
}

// Monta o link que abre a conversa com a mensagem pronta.
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const number = normalizePhone(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// Só o primeiro nome — "Oi, Maria" soa melhor que "Oi, Maria Aparecida Silva".
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

// ---------- Mensagens prontas ----------
//
// Todas em primeira pessoa e assinadas com o nome do nutricionista, porque
// quem recebe precisa saber de quem é a mensagem antes de responder.

export function lembreteConsulta(
  patientName: string,
  nutriName: string,
  scheduledAt: Date
): string {
  return [
    `Oi, ${firstName(patientName)}! Tudo bem?`,
    "",
    `Passando para lembrar da sua consulta em ${formatDate(scheduledAt)} às ${formatTime(scheduledAt)}.`,
    "",
    "Se precisar remarcar, é só me avisar por aqui.",
    "",
    nutriName,
  ].join("\n");
}

export function cobrancaPendente(
  patientName: string,
  nutriName: string,
  descricao: string,
  valor: string,
  vencimento: Date | null
): string {
  const linhaVencimento = vencimento
    ? `Vencimento: ${formatDate(vencimento)}.`
    : "Quando puder, me avisa para eu dar baixa.";

  return [
    `Oi, ${firstName(patientName)}!`,
    "",
    `Sobre ${descricao.toLowerCase()}: o valor é ${valor}.`,
    linhaVencimento,
    "",
    "Qualquer dúvida, me chama por aqui.",
    "",
    nutriName,
  ].join("\n");
}

export function planoPronto(patientName: string, nutriName: string, titulo: string): string {
  return [
    `Oi, ${firstName(patientName)}!`,
    "",
    `Seu plano alimentar "${titulo}" está pronto. Vou te enviar em seguida.`,
    "",
    "Leia com calma e me manda suas dúvidas — a gente ajusta o que precisar.",
    "",
    nutriName,
  ].join("\n");
}

export function retomarContato(patientName: string, nutriName: string, diasSemVir: number): string {
  return [
    `Oi, ${firstName(patientName)}! Tudo bem?`,
    "",
    `Vi aqui que faz ${diasSemVir} dias desde a nossa última consulta e fiquei pensando em você.`,
    "",
    "Quer marcar um retorno para a gente ver como estão as coisas?",
    "",
    nutriName,
  ].join("\n");
}

// Abertura neutra, para quando não há um assunto específico (nem consulta
// marcada, nem cobrança). O nutricionista completa o resto no próprio app.
export function saudacao(patientName: string, nutriName: string): string {
  return [`Oi, ${firstName(patientName)}! Tudo bem?`, "", nutriName].join("\n");
}

export function confirmacaoAgendamento(
  patientName: string,
  nutriName: string,
  scheduledAt: Date
): string {
  return [
    `Oi, ${firstName(patientName)}!`,
    "",
    `Sua consulta ficou confirmada para ${formatDateTime(scheduledAt)}.`,
    "",
    "Até lá!",
    "",
    nutriName,
  ].join("\n");
}
