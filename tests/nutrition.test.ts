import { describe, it, expect } from "vitest";
import {
  calcEnergy,
  ageFrom,
  macrosFor,
  addMacros,
  macroSplit,
  roundMacros,
  ZERO,
} from "@/lib/nutrition";

// As fórmulas de gasto energético são a base da prescrição. Um erro aqui
// vira uma dieta errada — por isso conferimos contra contas feitas à mão.

describe("calcEnergy — TMB e GET", () => {
  it("Mifflin-St Jeor para homem: 10×80 + 6.25×180 − 5×30 + 5 = 1780", () => {
    const r = calcEnergy({
      sex: "M",
      ageYears: 30,
      weightKg: 80,
      heightCm: 180,
      activityLevel: 1.55,
    });
    expect(r?.mifflin).toBe(1780);
  });

  it("Mifflin-St Jeor para mulher: 10×60 + 6.25×165 − 5×30 − 161 = 1320", () => {
    const r = calcEnergy({
      sex: "F",
      ageYears: 30,
      weightKg: 60,
      heightCm: 165,
      activityLevel: 1.2,
    });
    expect(r?.mifflin).toBe(1320);
  });

  it("GET é a TMB multiplicada pelo fator de atividade", () => {
    const r = calcEnergy({
      sex: "M",
      ageYears: 30,
      weightKg: 80,
      heightCm: 180,
      activityLevel: 1.55,
    });
    expect(r?.get).toBe(Math.round(1780 * 1.55)); // 2759
  });

  it("usa 1.55 como fator quando o nível de atividade não foi definido", () => {
    const r = calcEnergy({
      sex: "M",
      ageYears: 30,
      weightKg: 80,
      heightCm: 180,
      activityLevel: null,
    });
    expect(r?.activityLevel).toBe(1.55);
  });

  it("Harris-Benedict difere de Mifflin (são fórmulas distintas)", () => {
    const r = calcEnergy({
      sex: "M",
      ageYears: 30,
      weightKg: 80,
      heightCm: 180,
      activityLevel: 1.55,
    });
    expect(r?.harris).toBe(1854);
    expect(r?.harris).not.toBe(r?.mifflin);
  });

  // Mostrar um número errado seria pior que não mostrar nada.
  it.each([
    ["sem peso", { sex: "M", ageYears: 30, weightKg: null, heightCm: 180 }],
    ["sem altura", { sex: "M", ageYears: 30, weightKg: 80, heightCm: null }],
    ["sem idade", { sex: "M", ageYears: null, weightKg: 80, heightCm: 180 }],
    ["sem sexo", { sex: null, ageYears: 30, weightKg: 80, heightCm: 180 }],
    ["sexo 'Outro'", { sex: "Outro", ageYears: 30, weightKg: 80, heightCm: 180 }],
  ])("retorna null quando falta dado: %s", (_caso, entrada) => {
    expect(calcEnergy({ ...entrada, activityLevel: 1.55 } as never)).toBeNull();
  });
});

describe("ageFrom", () => {
  it("calcula a idade a partir da data de nascimento", () => {
    const trintaAnosAtras = new Date(Date.now() - 30 * 365.25 * 24 * 3600 * 1000);
    expect(ageFrom(trintaAnosAtras)).toBe(30);
  });

  it("retorna null sem data de nascimento", () => {
    expect(ageFrom(null)).toBeNull();
  });

  it("ignora datas absurdas (futuro ou idade impossível)", () => {
    expect(ageFrom(new Date(Date.now() + 86400000))).toBeNull();
    expect(ageFrom(new Date("1800-01-01"))).toBeNull();
  });
});

describe("macrosFor — regra de três sobre 100 g", () => {
  const frango = { kcal: 159.19, proteinG: 32.03, carbG: 0, fatG: 2.48 };

  it("150 g de peito de frango = 239 kcal e 48 g de proteína", () => {
    const m = roundMacros(macrosFor(frango, 150));
    expect(m.kcal).toBe(239);
    expect(m.protein).toBe(48);
  });

  it("100 g devolve os valores da tabela sem alteração", () => {
    const m = macrosFor(frango, 100);
    expect(m.kcal).toBeCloseTo(159.19, 2);
  });

  it("0 g não soma nada", () => {
    expect(macrosFor(frango, 0)).toEqual(ZERO);
  });
});

describe("addMacros e macroSplit", () => {
  it("soma os macros de vários alimentos", () => {
    const a = { kcal: 100, protein: 10, carb: 5, fat: 2 };
    const b = { kcal: 50, protein: 3, carb: 8, fat: 1 };
    expect(addMacros(a, b)).toEqual({ kcal: 150, protein: 13, carb: 13, fat: 3 });
  });

  it("distribui as calorias entre os macros usando 4/4/9 kcal por grama", () => {
    // 100 g de carbo (400 kcal) + 100 g de proteína (400) + 0 g de gordura
    const split = macroSplit({ kcal: 800, protein: 100, carb: 100, fat: 0 });
    expect(split).toEqual({ protein: 50, carb: 50, fat: 0 });
  });

  it("não divide por zero num plano vazio", () => {
    expect(macroSplit(ZERO)).toEqual({ protein: 0, carb: 0, fat: 0 });
  });
});
