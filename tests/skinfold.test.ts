import { describe, it, expect } from "vitest";
import {
  bodyFatFromSkinfolds,
  classificar,
  idadeEm,
  PROTOCOLOS,
} from "@/lib/skinfold";

// Caso de referência conferido na mão com a equação publicada.
// Homem, 30 anos, sete dobras somando 100 mm:
//   Dc = 1.112 − 0.00043499(100) + 0.00000055(100²) − 0.00028826(30)
//      = 1.112 − 0.043499 + 0.0055 − 0.0086478 = 1.0653532
//   %G = 495/1.0653532 − 450 = 14.6
const HOMEM_7 = {
  chestMm: 10,
  midaxillaryMm: 12,
  tricepsMm: 14,
  subscapularMm: 16,
  abdominalMm: 20,
  suprailiacMm: 18,
  thighMm: 10,
}; // soma = 100

describe("Pollock 7 dobras", () => {
  it("bate com o cálculo feito à mão (homem, 30 anos)", () => {
    const pct = bodyFatFromSkinfolds("pollock7", HOMEM_7, "M", 30);
    expect(pct).toBeCloseTo(14.6, 1);
  });

  // A equação feminina é outra — usar a masculina para uma mulher é o erro
  // clássico de quem implementa isso rápido demais.
  it("usa equação diferente para mulheres", () => {
    const homem = bodyFatFromSkinfolds("pollock7", HOMEM_7, "M", 30);
    const mulher = bodyFatFromSkinfolds("pollock7", HOMEM_7, "F", 30);
    expect(mulher).not.toBe(homem);
    expect(mulher!).toBeGreaterThan(homem!);
  });

  it("o percentual sobe com a idade, com as mesmas dobras", () => {
    const jovem = bodyFatFromSkinfolds("pollock7", HOMEM_7, "M", 20)!;
    const maduro = bodyFatFromSkinfolds("pollock7", HOMEM_7, "M", 50)!;
    expect(maduro).toBeGreaterThan(jovem);
  });

  it("o percentual sobe quando as dobras aumentam", () => {
    const magro = bodyFatFromSkinfolds("pollock7", HOMEM_7, "M", 30)!;
    const gordo = bodyFatFromSkinfolds(
      "pollock7",
      Object.fromEntries(Object.entries(HOMEM_7).map(([k, v]) => [k, v * 2])),
      "M",
      30
    )!;
    expect(gordo).toBeGreaterThan(magro);
  });
});

describe("Pollock 3 dobras", () => {
  // Homem usa peitoral, abdominal e coxa; mulher usa tríceps, suprailíaca e
  // coxa. Se o código ignorasse isso, os dois cairiam no mesmo conjunto.
  it("pede pontos diferentes conforme o sexo", () => {
    const p3 = PROTOCOLOS.find((p) => p.id === "pollock3")!;
    expect(p3.dobras("M")).toEqual(["chestMm", "abdominalMm", "thighMm"]);
    expect(p3.dobras("F")).toEqual(["tricepsMm", "suprailiacMm", "thighMm"]);
  });

  it("calcula com as três dobras masculinas", () => {
    // soma = 45; Dc = 1.10938 − 0.0008267(45) + 0.0000016(2025) − 0.0002574(30)
    //             = 1.10938 − 0.0372015 + 0.00324 − 0.007722 = 1.0676965
    // %G = 495/1.0676965 − 450 = 13.6
    const pct = bodyFatFromSkinfolds(
      "pollock3",
      { chestMm: 10, abdominalMm: 20, thighMm: 15 },
      "M",
      30
    );
    expect(pct).toBeCloseTo(13.6, 1);
  });

  it("não calcula para mulher se faltarem as dobras dela", () => {
    // Tem as três masculinas, mas nenhuma das femininas.
    const pct = bodyFatFromSkinfolds(
      "pollock3",
      { chestMm: 10, abdominalMm: 20, thighMm: 15 },
      "F",
      30
    );
    expect(pct).toBeNull();
  });
});

describe("Faulkner", () => {
  it("vai direto da soma ao percentual", () => {
    // (10+15+20+25) × 0,153 + 5,783 = 70 × 0,153 + 5,783 = 16,5
    const pct = bodyFatFromSkinfolds(
      "faulkner",
      { tricepsMm: 10, subscapularMm: 15, suprailiacMm: 20, abdominalMm: 25 },
      "M",
      30
    );
    expect(pct).toBeCloseTo(16.5, 1);
  });

  it("não depende de idade nem de sexo", () => {
    const dobras = {
      tricepsMm: 10,
      subscapularMm: 15,
      suprailiacMm: 20,
      abdominalMm: 25,
    };
    expect(bodyFatFromSkinfolds("faulkner", dobras, "F", 60)).toBe(
      bodyFatFromSkinfolds("faulkner", dobras, "M", 20)
    );
    // E funciona mesmo sem esses dados no cadastro.
    expect(bodyFatFromSkinfolds("faulkner", dobras, null, null)).toBeCloseTo(16.5, 1);
  });
});

describe("recusas — melhor um traço que um número inventado", () => {
  it("não calcula com dobra faltando", () => {
    const { thighMm, ...faltando } = HOMEM_7;
    void thighMm;
    expect(bodyFatFromSkinfolds("pollock7", faltando, "M", 30)).toBeNull();
  });

  it("não calcula com dobra zerada ou negativa", () => {
    expect(bodyFatFromSkinfolds("pollock7", { ...HOMEM_7, thighMm: 0 }, "M", 30)).toBeNull();
    expect(bodyFatFromSkinfolds("pollock7", { ...HOMEM_7, thighMm: -5 }, "M", 30)).toBeNull();
  });

  it("Pollock exige idade e sexo", () => {
    expect(bodyFatFromSkinfolds("pollock7", HOMEM_7, "M", null)).toBeNull();
    expect(bodyFatFromSkinfolds("pollock7", HOMEM_7, null, 30)).toBeNull();
  });

  // Anotar a dobra em centímetros em vez de milímetros é o engano mais comum
  // com adipômetro. O resultado sai fora da faixa fisiológica e é recusado.
  it("recusa resultado fora da faixa fisiológica", () => {
    const emCm = Object.fromEntries(Object.entries(HOMEM_7).map(([k, v]) => [k, v / 10]));
    const gigante = Object.fromEntries(Object.entries(HOMEM_7).map(([k, v]) => [k, v * 10]));
    expect(bodyFatFromSkinfolds("pollock7", emCm, "M", 30)).toBeNull();
    expect(bodyFatFromSkinfolds("pollock7", gigante, "M", 30)).toBeNull();
  });
});

describe("classificar", () => {
  it("usa faixas diferentes para homens e mulheres", () => {
    expect(classificar(20, "M")).toBe("aceitável");
    expect(classificar(20, "F")).toBe("atlético");
  });

  it("marca os extremos", () => {
    expect(classificar(4, "M")).toBe("abaixo do essencial");
    expect(classificar(35, "F")).toBe("acima do recomendado");
  });
});

describe("idadeEm", () => {
  it("calcula a idade na data da avaliação", () => {
    const nascimento = new Date("1990-03-15T00:00:00-03:00");
    expect(idadeEm(nascimento, new Date("2026-08-05T00:00:00-03:00"))).toBe(36);
    expect(idadeEm(nascimento, new Date("2026-01-05T00:00:00-03:00"))).toBe(35);
  });

  it("devolve null sem data de nascimento", () => {
    expect(idadeEm(null, new Date())).toBeNull();
  });
});
