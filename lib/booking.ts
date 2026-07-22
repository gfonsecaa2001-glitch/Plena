// Cálculo dos horários livres para o link público de agendamento.
//
// A regra é simples: geramos todos os encaixes possíveis dentro da agenda de
// trabalho do nutricionista e removemos os que já estão ocupados ou no passado.
//
// PRIVACIDADE: o resultado diz apenas "livre" ou "não aparece". O visitante
// nunca fica sabendo quem marcou, nem que alguém marcou — um horário ocupado
// simplesmente não é oferecido.

import { TZ } from "./datetime";

const OFFSET = "-03:00";
const DAYS_AHEAD = 21;

export type DaySlots = {
  isoDay: string; // "2026-07-28"
  label: string; // "seg, 28 de julho"
  slots: { iso: string; label: string }[]; // iso = valor enviado no formulário
};

export type BookingConfig = {
  bookingDays: string;
  bookingStart: number;
  bookingEnd: number;
  bookingSlotMin: number;
};

// Dia da semana (1=segunda … 7=domingo) de uma data ISO, no fuso do Brasil.
function weekday(isoDay: string): number {
  const d = new Date(`${isoDay}T12:00:00${OFFSET}`).getUTCDay(); // 0=domingo
  return d === 0 ? 7 : d;
}

function addDays(isoDay: string, n: number): string {
  const d = new Date(`${isoDay}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function buildSlots(
  config: BookingConfig,
  busy: Date[],
  todayIso: string,
  now: Date
): DaySlots[] {
  const openDays = new Set(
    config.bookingDays
      .split(",")
      .map((d) => Number(d.trim()))
      .filter(Boolean)
  );
  // Guarda os horários ocupados como texto ISO para comparar rápido.
  const busySet = new Set(busy.map((b) => b.toISOString()));

  const days: DaySlots[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const isoDay = addDays(todayIso, i);
    if (!openDays.has(weekday(isoDay))) continue;

    const slots: { iso: string; label: string }[] = [];
    const stepMs = config.bookingSlotMin * 60_000;
    const dayStart = new Date(
      `${isoDay}T${String(config.bookingStart).padStart(2, "0")}:00:00${OFFSET}`
    );
    const dayEnd = new Date(
      `${isoDay}T${String(config.bookingEnd).padStart(2, "0")}:00:00${OFFSET}`
    );

    for (let t = dayStart.getTime(); t + stepMs <= dayEnd.getTime(); t += stepMs) {
      const slot = new Date(t);
      if (slot.getTime() <= now.getTime()) continue; // já passou
      if (busySet.has(slot.toISOString())) continue; // ocupado
      slots.push({
        iso: slot.toISOString(),
        label: slot.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: TZ,
        }),
      });
    }

    if (slots.length === 0) continue;

    days.push({
      isoDay,
      label: new Date(`${isoDay}T12:00:00${OFFSET}`).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        timeZone: TZ,
      }),
      slots,
    });
  }

  return days;
}

// Gera um endereço amigável a partir do nome ("Gabriel Fonseca" → "gabriel-fonseca")
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
