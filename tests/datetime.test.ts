import { describe, it, expect } from "vitest";
import {
  parseDateInput,
  parseDateTimeInput,
  formatDate,
  formatDateTime,
  formatTime,
  dayRange,
  relativeDays,
  daysSince,
} from "@/lib/datetime";

// O servidor roda em UTC e os usuários estão no Brasil. Sem tratar o fuso, a
// agenda "vira o dia" às 21h e uma consulta das 10h aparece como 13h.

describe("leitura dos campos do formulário", () => {
  it("interpreta data e hora como horário de Brasília", () => {
    const d = parseDateTimeInput("2026-08-03T10:00");
    // 10h em Brasília (UTC−3) = 13h UTC
    expect(d.toISOString()).toBe("2026-08-03T13:00:00.000Z");
  });

  it("interpreta data pura como meia-noite em Brasília", () => {
    expect(parseDateInput("2026-08-03").toISOString()).toBe("2026-08-03T03:00:00.000Z");
  });
});

describe("exibição sempre no fuso do Brasil", () => {
  it("mostra a hora que o nutricionista digitou, não a UTC", () => {
    const consulta = parseDateTimeInput("2026-08-03T10:00");
    expect(formatTime(consulta)).toBe("10:00");
    expect(formatDateTime(consulta)).toContain("10:00");
  });

  it("formata a data no padrão brasileiro", () => {
    expect(formatDate(parseDateInput("2026-08-03"))).toBe("03/08/2026");
  });

  it("um instante logo antes da meia-noite ainda é o mesmo dia no Brasil", () => {
    // 23h de 3/ago em Brasília = 02h de 4/ago em UTC
    const tarde = new Date("2026-08-04T02:00:00.000Z");
    expect(formatDate(tarde)).toBe("03/08/2026");
  });
});

describe("dayRange — usado para achar as consultas de hoje", () => {
  it("cobre exatamente 24 horas a partir da meia-noite de Brasília", () => {
    const { start, end } = dayRange("2026-08-03");
    expect(start.toISOString()).toBe("2026-08-03T03:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * 3600 * 1000);
  });

  it("uma consulta às 23h entra no dia certo", () => {
    const { start, end } = dayRange("2026-08-03");
    const tarde = parseDateTimeInput("2026-08-03T23:00");
    expect(tarde >= start && tarde < end).toBe(true);
  });
});

describe("relativeDays", () => {
  const dia = 86400000;

  it("descreve o passado", () => {
    expect(relativeDays(new Date())).toBe("hoje");
    expect(relativeDays(new Date(Date.now() - dia))).toBe("ontem");
    expect(relativeDays(new Date(Date.now() - 5 * dia))).toBe("há 5 dias");
  });

  // Isto já apareceu em produção como "há -6 dias".
  it("descreve o futuro sem número negativo", () => {
    expect(relativeDays(new Date(Date.now() + dia))).toBe("amanhã");
    expect(relativeDays(new Date(Date.now() + 6 * dia))).toBe("em 6 dias");
    expect(relativeDays(new Date(Date.now() + 40 * dia))).not.toContain("-");
  });

  it("nunca devolve texto com sinal negativo", () => {
    for (const d of [-90, -10, -1, 0, 1, 10, 90]) {
      expect(relativeDays(new Date(Date.now() + d * dia))).not.toMatch(/-\d/);
    }
  });
});

describe("daysSince", () => {
  it("conta em dias de calendário, não em blocos de 24 h", () => {
    expect(daysSince(new Date())).toBe(0);
    expect(daysSince(new Date(Date.now() - 3 * 86400000))).toBe(3);
  });
});
