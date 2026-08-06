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
  // Intervalo diário (almoço), em minutos desde a meia-noite. 12:00 = 720.
  // Em minutos, e não em horas, porque almoço de verdade termina 13:30.
  breakStartMin?: number | null;
  breakEndMin?: number | null;
};

// Período indisponível: férias, congresso, uma tarde de folga.
export type Intervalo = { start: Date; end: Date };

// Dois períodos se sobrepõem quando um começa antes do outro terminar.
// O fim é exclusivo: uma consulta que termina 11:00 não conflita com outra
// que começa 11:00.
function sobrepoe(aInicio: number, aFim: number, bInicio: number, bFim: number): boolean {
  return aInicio < bFim && aFim > bInicio;
}

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
  now: Date,
  blocks: Intervalo[] = []
): DaySlots[] {
  const openDays = new Set(
    config.bookingDays
      .split(",")
      .map((d) => Number(d.trim()))
      .filter(Boolean)
  );

  const stepMs = config.bookingSlotMin * 60_000;

  // Consulta ocupada é um PERÍODO, não um instante.
  //
  // Comparar só o horário de início deixava passar o caso real: o
  // nutricionista marca 10:30 na mão (o campo aceita qualquer minuto) e o
  // encaixe público das 10:00–11:00 continuava sendo oferecido — duas
  // pessoas na mesma sala.
  const ocupados: Intervalo[] = busy.map((inicio) => ({
    start: inicio,
    end: new Date(inicio.getTime() + stepMs),
  }));

  const days: DaySlots[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const isoDay = addDays(todayIso, i);
    if (!openDays.has(weekday(isoDay))) continue;

    const slots: { iso: string; label: string }[] = [];
    const dayStart = new Date(
      `${isoDay}T${String(config.bookingStart).padStart(2, "0")}:00:00${OFFSET}`
    );
    const dayEnd = new Date(
      `${isoDay}T${String(config.bookingEnd).padStart(2, "0")}:00:00${OFFSET}`
    );

    for (let t = dayStart.getTime(); t + stepMs <= dayEnd.getTime(); t += stepMs) {
      const slot = new Date(t);
      const fim = t + stepMs;
      if (slot.getTime() <= now.getTime()) continue; // já passou

      // Ocupado por uma consulta — mesmo que ela comece "fora da grade".
      if (ocupados.some((o) => sobrepoe(t, fim, o.start.getTime(), o.end.getTime()))) continue;

      // Dentro de um período bloqueado (férias, congresso, tarde de folga).
      if (blocks.some((b) => sobrepoe(t, fim, b.start.getTime(), b.end.getTime()))) continue;

      // Dentro do intervalo diário. O minuto do dia vem da própria contagem
      // do laço, sem formatar data — não há como o fuso atrapalhar.
      if (config.breakStartMin != null && config.breakEndMin != null) {
        const minutoInicio = config.bookingStart * 60 + (t - dayStart.getTime()) / 60_000;
        const minutoFim = minutoInicio + config.bookingSlotMin;
        if (sobrepoe(minutoInicio, minutoFim, config.breakStartMin, config.breakEndMin)) continue;
      }

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
