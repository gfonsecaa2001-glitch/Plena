import { describe, it, expect } from "vitest";
import { estaVencida, diaISO, inicioDeHoje } from "@/lib/charges";

const dia = (iso: string) => new Date(`${iso}T00:00:00-03:00`);

describe("estaVencida", () => {
  const hoje = "2026-08-05";

  // O defeito que existia: o limite era o FIM de hoje, então a cobrança que
  // vencia hoje já aparecia de vermelho como atrasada.
  it("cobrança que vence HOJE não está vencida", () => {
    expect(estaVencida(dia("2026-08-05"), hoje)).toBe(false);
  });

  it("cobrança de ontem está vencida", () => {
    expect(estaVencida(dia("2026-08-04"), hoje)).toBe(true);
  });

  it("cobrança de amanhã não está vencida", () => {
    expect(estaVencida(dia("2026-08-06"), hoje)).toBe(false);
  });

  it("sem vencimento definido, nunca está vencida", () => {
    expect(estaVencida(null, hoje)).toBe(false);
    expect(estaVencida(undefined, hoje)).toBe(false);
  });

  // O vencimento é gravado à meia-noite de Brasília. Em UTC isso é 03:00 do
  // mesmo dia — se a comparação fosse por instante e não por dia, a virada
  // de fuso bagunçaria o resultado.
  it("resiste à diferença de fuso entre o servidor (UTC) e o Brasil", () => {
    const vencimentoHoje = new Date("2026-08-05T03:00:00.000Z"); // 00:00 em Brasília
    expect(estaVencida(vencimentoHoje, "2026-08-05")).toBe(false);
    expect(estaVencida(vencimentoHoje, "2026-08-06")).toBe(true);
  });

  it("data quase à meia-noite do Brasil ainda é do dia certo", () => {
    // 23:59 de 05/08 em Brasília = 02:59Z de 06/08
    const quaseMeiaNoite = new Date("2026-08-06T02:59:00.000Z");
    expect(diaISO(quaseMeiaNoite)).toBe("2026-08-05");
    expect(estaVencida(quaseMeiaNoite, "2026-08-05")).toBe(false);
  });
});

describe("inicioDeHoje", () => {
  it("é o primeiro instante do dia em Brasília", () => {
    expect(inicioDeHoje("2026-08-05").toISOString()).toBe("2026-08-05T03:00:00.000Z");
  });

  // É o limite usado na consulta ao banco: dueDate < inicioDeHoje.
  it("deixa de fora quem vence hoje e inclui quem venceu ontem", () => {
    const limite = inicioDeHoje("2026-08-05");
    expect(dia("2026-08-05").getTime() < limite.getTime()).toBe(false);
    expect(dia("2026-08-04").getTime() < limite.getTime()).toBe(true);
  });
});
