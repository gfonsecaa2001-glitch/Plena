import { describe, it, expect } from "vitest";
import { parseMoneyToCents, formatCents, centsToInput } from "@/lib/money";

// Dinheiro é onde erro de arredondamento vira diferença de caixa. Todo valor
// vive como inteiro de centavos justamente para a soma ser exata.

describe("parseMoneyToCents", () => {
  it.each([
    ["150", 15000],
    ["150,00", 15000],
    ["150,50", 15050],
    ["0,99", 99],
    ["1.234,56", 123456],
    ["R$ 150,00", 15000],
    ["r$150", 15000],
    [" 150,00 ", 15000],
  ])("lê %s como %i centavos", (entrada, esperado) => {
    expect(parseMoneyToCents(entrada)).toBe(esperado);
  });

  it("entende ponto como milhar quando há 3 dígitos depois", () => {
    expect(parseMoneyToCents("1.234")).toBe(123400);
    expect(parseMoneyToCents("10.000")).toBe(1000000);
  });

  it("entende ponto como decimal quando veio de planilha", () => {
    expect(parseMoneyToCents("150.50")).toBe(15050);
    expect(parseMoneyToCents("150.5")).toBe(15050);
  });

  it.each([
    ["vazio", ""],
    ["nulo", null],
    ["indefinido", undefined],
    ["texto", "abc"],
    ["negativo", "-50"],
  ])("recusa entrada inválida: %s", (_caso, entrada) => {
    expect(parseMoneyToCents(entrada)).toBeNull();
  });

  it("arredonda para o centavo mais próximo sem perder um centavo", () => {
    // 14.999999 em ponto flutuante truncaria para 1499
    expect(parseMoneyToCents("14,999")).toBe(1500);
    expect(parseMoneyToCents("0,005")).toBe(1);
  });
});

describe("somar valores em centavos é exato", () => {
  it("0,10 + 0,20 dá exatamente 0,30", () => {
    const soma = parseMoneyToCents("0,10")! + parseMoneyToCents("0,20")!;
    expect(soma).toBe(30);
    expect(formatCents(soma)).toContain("0,30");
  });

  it("somar 100 consultas de 149,90 não acumula erro", () => {
    const uma = parseMoneyToCents("149,90")!;
    const total = Array.from({ length: 100 }).reduce<number>((s) => s + uma, 0);
    expect(total).toBe(1499000); // R$ 14.990,00 exatos
  });
});

describe("formatCents", () => {
  it("formata no padrão brasileiro", () => {
    expect(formatCents(15000)).toContain("150,00");
    expect(formatCents(123456)).toContain("1.234,56");
    expect(formatCents(0)).toContain("0,00");
  });

  it("inclui o símbolo da moeda", () => {
    expect(formatCents(15000)).toMatch(/R\$/);
  });
});

describe("centsToInput", () => {
  it("devolve o valor pronto para o campo do formulário", () => {
    expect(centsToInput(15000)).toBe("150,00");
    expect(centsToInput(99)).toBe("0,99");
  });

  it("o que sai do campo volta igual ao entrar", () => {
    for (const cents of [1, 99, 15000, 123456]) {
      expect(parseMoneyToCents(centsToInput(cents))).toBe(cents);
    }
  });
});
