// Quando uma cobrança está vencida.
//
// Parece detalhe, mas não é: "vence hoje" e "venceu" são coisas diferentes
// para quem recebe a cobrança. Marcar de vermelho uma consulta que vence hoje
// faz o nutricionista cobrar o paciente antes da hora.

import { TZ, todayISO } from "./datetime";

// O dia (YYYY-MM-DD) de uma data, no fuso do Brasil.
export function diaISO(data: Date): string {
  return data.toLocaleDateString("en-CA", { timeZone: TZ });
}

// Vencida = o dia do vencimento já passou. Comparar texto ISO evita
// completamente a armadilha de comparar instantes: o vencimento é gravado à
// meia-noite, então qualquer comparação com "agora" acusaria o dia inteiro
// de hoje como atrasado.
export function estaVencida(
  dueDate: Date | null | undefined,
  hoje: string = todayISO()
): boolean {
  if (!dueDate) return false; // sem prazo definido nunca está atrasada
  return diaISO(dueDate) < hoje;
}

// Limite para a consulta ao banco: só é vencida a cobrança com vencimento
// ANTERIOR ao primeiro instante de hoje.
export function inicioDeHoje(hoje: string = todayISO()): Date {
  return new Date(`${hoje}T00:00:00-03:00`);
}
