// Datas e horários sempre no fuso do Brasil.
//
// O servidor (Vercel) roda em UTC. Sem isso, uma consulta marcada para as 10h
// apareceria como 13h, e "hoje" viraria de dia às 21h no horário de Brasília.
//
// O Brasil não tem mais horário de verão (abolido em 2019), então o fuso é fixo
// em UTC-3 — isso simplifica: dá pra tratar como um deslocamento constante.

export const TZ = "America/Sao_Paulo";
const OFFSET = "-03:00";

// "2026-07-27T10:00" (input datetime-local) → instante correto em Brasília
export function parseDateTimeInput(value: string): Date {
  return new Date(`${value}:00${OFFSET}`);
}

// "2026-07-27" (input date) → meia-noite em Brasília
export function parseDateInput(value: string): Date {
  return new Date(`${value}T00:00:00${OFFSET}`);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: TZ });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TZ,
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

// "YYYY-MM-DD" do dia de hoje em Brasília ("en-CA" produz exatamente esse formato)
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// Início e fim de um dia (em instantes absolutos), para filtrar no banco
export function dayRange(isoDay: string): { start: Date; end: Date } {
  const start = new Date(`${isoDay}T00:00:00${OFFSET}`);
  return { start, end: new Date(start.getTime() + 86400000) };
}

// Mês atual em Brasília (1-12) e primeiro instante do mês
export function currentMonth(): { month: number; start: Date } {
  const [y, m] = todayISO().split("-").map(Number);
  return { month: m, start: new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00${OFFSET}`) };
}

// Quantos dias se passaram desde a data (em dias de calendário no Brasil)
export function daysSince(date: Date): number {
  const a = new Date(date.toLocaleDateString("en-CA", { timeZone: TZ })).getTime();
  const b = new Date(todayISO()).getTime();
  return Math.round((b - a) / 86400000);
}

export function relativeDays(date: Date): string {
  const d = daysSince(date);
  // Datas futuras existem de verdade (uma avaliação agendada, um erro de
  // digitação) — sem este caso, apareceria "há -6 dias".
  if (d < 0) {
    const f = Math.abs(d);
    if (f === 1) return "amanhã";
    if (f < 30) return `em ${f} dias`;
    return `em ${Math.floor(f / 30)} ${Math.floor(f / 30) === 1 ? "mês" : "meses"}`;
  }
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  if (d < 60) return "há 1 mês";
  return `há ${Math.floor(d / 30)} meses`;
}
