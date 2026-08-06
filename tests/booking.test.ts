import { describe, it, expect } from "vitest";
import { buildSlots, slugify, type BookingConfig } from "@/lib/booking";

// O cálculo de horários livres é o que impede dois pacientes na mesma hora.
// Um erro aqui vira consulta sobreposta na agenda de alguém.

const OFF = "-03:00";

const config: BookingConfig = {
  bookingDays: "1,2,3,4,5", // segunda a sexta
  bookingStart: 8,
  bookingEnd: 12,
  bookingSlotMin: 60,
};

// Segunda-feira, 3 de agosto de 2026, às 6h da manhã (antes do expediente).
const segunda = "2026-08-03";
const agoraCedo = new Date(`${segunda}T06:00:00${OFF}`);

describe("buildSlots — geração de horários", () => {
  it("gera um horário por hora dentro do expediente", () => {
    const dias = buildSlots(config, [], segunda, agoraCedo);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toEqual(["08:00", "09:00", "10:00", "11:00"]);
  });

  it("respeita a duração da consulta", () => {
    const dias = buildSlots({ ...config, bookingSlotMin: 30 }, [], segunda, agoraCedo);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots).toHaveLength(8); // 8h–12h em blocos de 30 min
  });

  it("não oferece um horário já ocupado", () => {
    const ocupado = new Date(`${segunda}T09:00:00${OFF}`);
    const dias = buildSlots(config, [ocupado], segunda, agoraCedo);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toEqual(["08:00", "10:00", "11:00"]);
  });

  it("não oferece horários que já passaram", () => {
    const agora10h30 = new Date(`${segunda}T10:30:00${OFF}`);
    const dias = buildSlots(config, [], segunda, agora10h30);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toEqual(["11:00"]);
  });

  it("pula os dias em que o nutricionista não atende", () => {
    // Só segundas (dia 1). Em 21 dias caem várias segundas — o que importa é
    // que TODAS as datas devolvidas sejam segunda-feira.
    const dias = buildSlots({ ...config, bookingDays: "1" }, [], segunda, agoraCedo);
    expect(dias.length).toBeGreaterThan(1);
    for (const d of dias) {
      const diaDaSemana = new Date(`${d.isoDay}T12:00:00${OFF}`).getUTCDay();
      expect(diaDaSemana).toBe(1); // 1 = segunda
    }
  });

  it("inclui sábado quando ele está na configuração", () => {
    const dias = buildSlots({ ...config, bookingDays: "6" }, [], segunda, agoraCedo);
    // 8 de agosto de 2026 é um sábado
    expect(dias.some((d) => d.isoDay === "2026-08-08")).toBe(true);
  });

  it("omite o dia inteiro quando não sobra nenhum horário", () => {
    const todosOcupados = ["08:00", "09:00", "10:00", "11:00"].map(
      (h) => new Date(`${segunda}T${h}:00${OFF}`)
    );
    const dias = buildSlots(config, todosOcupados, segunda, agoraCedo);
    expect(dias.find((d) => d.isoDay === segunda)).toBeUndefined();
  });

  it("não oferece nada quando o expediente é menor que a duração da consulta", () => {
    const semEspaco = { ...config, bookingStart: 8, bookingEnd: 9, bookingSlotMin: 90 };
    const dias = buildSlots(semEspaco, [], segunda, agoraCedo);
    expect(dias).toHaveLength(0);
  });

  it("os horários são devolvidos em ISO, que é o que o formulário envia", () => {
    const dias = buildSlots(config, [], segunda, agoraCedo);
    const primeiro = dias[0].slots[0];
    // 08:00 no horário de Brasília = 11:00 UTC
    expect(primeiro.iso).toBe(new Date(`${segunda}T08:00:00${OFF}`).toISOString());
    expect(primeiro.iso).toContain("T11:00:00");
  });
});

describe("slugify — endereço do link de agendamento", () => {
  it("troca espaços por hífens e usa minúsculas", () => {
    expect(slugify("Gabriel Fonseca")).toBe("gabriel-fonseca");
  });

  it("remove acentos e cedilha", () => {
    expect(slugify("Nutrição Ação")).toBe("nutricao-acao");
    expect(slugify("José Antônio")).toBe("jose-antonio");
  });

  it("descarta pontuação e não deixa hífen sobrando nas pontas", () => {
    expect(slugify("Dra. Ana — Nutri!")).toBe("dra-ana-nutri");
  });

  it("limita o tamanho", () => {
    expect(slugify("a".repeat(80)).length).toBeLessThanOrEqual(40);
  });
});

// ---------------------------------------------------------------------------
// Bloqueios, intervalo de almoço e consulta fora da grade
// ---------------------------------------------------------------------------

describe("buildSlots — consulta ocupada é um período, não um instante", () => {
  // O campo de agendamento interno aceita qualquer minuto. Uma consulta
  // marcada à mão às 10:30 precisa derrubar o encaixe público de 10:00–11:00,
  // senão duas pessoas caem na mesma sala.
  it("consulta fora da grade bloqueia o encaixe que ela invade", () => {
    const fora = new Date(`${segunda}T10:30:00${OFF}`);
    const dias = buildSlots(config, [fora], segunda, agoraCedo);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toEqual(["08:00", "09:00"]);
    // 10:00 cai porque 10:30 está dentro dele; 11:00 cai porque a consulta
    // das 10:30 dura até 11:30.
  });

  it("consulta que termina quando o encaixe começa não bloqueia", () => {
    const antes = new Date(`${segunda}T09:00:00${OFF}`); // ocupa 09:00–10:00
    const dias = buildSlots(config, [antes], segunda, agoraCedo);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toEqual(["08:00", "10:00", "11:00"]);
  });
});

describe("buildSlots — intervalo diário (almoço)", () => {
  const comAlmoco = { ...config, bookingEnd: 18, breakStartMin: 12 * 60, breakEndMin: 13 * 60 + 30 };

  it("não oferece encaixe dentro do almoço", () => {
    const dias = buildSlots(comAlmoco, [], segunda, agoraCedo);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toEqual([
      "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00",
    ]);
    // 12:00 e 13:00 somem: o de 13:00 iria até 14:00, invadindo o almoço
    // que só termina 13:30.
  });

  it("o encaixe que termina exatamente no início do almoço continua valendo", () => {
    const meioDia = { ...config, bookingEnd: 18, breakStartMin: 12 * 60, breakEndMin: 13 * 60 };
    const dias = buildSlots(meioDia, [], segunda, agoraCedo);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toContain("11:00"); // 11:00–12:00
    expect(hoje?.slots.map((s) => s.label)).not.toContain("12:00");
    expect(hoje?.slots.map((s) => s.label)).toContain("13:00"); // almoço acabou
  });

  it("sem intervalo configurado, nada muda", () => {
    const semAlmoco = buildSlots({ ...config, breakStartMin: null, breakEndMin: null }, [], segunda, agoraCedo);
    const normal = buildSlots(config, [], segunda, agoraCedo);
    expect(semAlmoco[0].slots.length).toBe(normal[0].slots.length);
  });
});

describe("buildSlots — períodos bloqueados", () => {
  it("férias somem da agenda inteira", () => {
    const ferias = {
      start: new Date(`${segunda}T00:00:00${OFF}`),
      end: new Date(`2026-08-08T00:00:00${OFF}`), // a semana toda
    };
    const dias = buildSlots(config, [], segunda, agoraCedo, [ferias]);
    // Nenhum dia da semana bloqueada aparece; a semana seguinte volta.
    expect(dias.every((d) => d.isoDay >= "2026-08-08")).toBe(true);
    expect(dias.length).toBeGreaterThan(0);
  });

  it("bloqueio de uma tarde derruba só a tarde", () => {
    const tarde = {
      start: new Date(`${segunda}T10:00:00${OFF}`),
      end: new Date(`${segunda}T23:59:00${OFF}`),
    };
    const dias = buildSlots(config, [], segunda, agoraCedo, [tarde]);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toEqual(["08:00", "09:00"]);
  });

  it("bloqueio em outro dia não afeta hoje", () => {
    const outroDia = {
      start: new Date(`2026-08-10T00:00:00${OFF}`),
      end: new Date(`2026-08-11T00:00:00${OFF}`),
    };
    const dias = buildSlots(config, [], segunda, agoraCedo, [outroDia]);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots).toHaveLength(4);
    expect(dias.find((d) => d.isoDay === "2026-08-10")).toBeUndefined();
  });

  it("vários bloqueios convivem", () => {
    const dias = buildSlots(config, [], segunda, agoraCedo, [
      { start: new Date(`${segunda}T08:00:00${OFF}`), end: new Date(`${segunda}T09:00:00${OFF}`) },
      { start: new Date(`${segunda}T11:00:00${OFF}`), end: new Date(`${segunda}T12:00:00${OFF}`) },
    ]);
    const hoje = dias.find((d) => d.isoDay === segunda);
    expect(hoje?.slots.map((s) => s.label)).toEqual(["09:00", "10:00"]);
  });
});
