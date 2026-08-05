import { describe, it, expect } from "vitest";
import { foodIcon, mealIcon } from "@/lib/food-icons";

// O reconhecimento é por palavra-chave sobre texto livre. O risco real aqui
// é a remoção de acentos falhar em silêncio — "feijão" nunca casaria com
// "feijao" e tudo cairia no ícone genérico sem ninguém perceber.

describe("foodIcon", () => {
  it.each([
    ["2 ovos mexidos", "🥚"],
    ["150g de frango grelhado", "🍗"],
    ["1 concha de feijão", "🫘"],
    ["4 col. de arroz integral", "🍚"],
    ["1 banana prata", "🍌"],
    ["filé de salmão", "🐟"],
    ["1 batata doce média", "🍠"],
    ["salada de folhas", "🥗"],
    ["1 copo de leite", "🥛"],
    ["whey protein", "💪"],
  ])("reconhece %s", (texto, esperado) => {
    expect(foodIcon(texto)).toBe(esperado);
  });

  it("funciona com e sem acento", () => {
    expect(foodIcon("feijão")).toBe(foodIcon("feijao"));
    expect(foodIcon("maçã")).toBe(foodIcon("maca"));
    expect(foodIcon("pão integral")).toBe(foodIcon("pao integral"));
  });

  it("ignora maiúsculas", () => {
    expect(foodIcon("ARROZ INTEGRAL")).toBe(foodIcon("arroz integral"));
  });

  it("aceita plural", () => {
    expect(foodIcon("2 bananas")).toBe("🍌");
    expect(foodIcon("3 ovos")).toBe("🥚");
  });

  it("prefere o termo mais específico: batata doce não vira batata comum", () => {
    expect(foodIcon("batata doce")).toBe("🍠");
    expect(foodIcon("batata cozida")).toBe("🥔");
    expect(foodIcon("batata doce")).not.toBe(foodIcon("batata cozida"));
  });

  it("cai num ícone neutro quando não reconhece", () => {
    expect(foodIcon("xyz preparação da casa")).toBe("🍽️");
    expect(foodIcon("")).toBe("🍽️");
  });
});

describe("mealIcon", () => {
  it.each([
    ["Café da manhã", "☀️"],
    ["Almoço", "🍽️"],
    ["Jantar", "🌙"],
    ["Lanche da tarde", "🍎"],
    ["Pré-treino", "🏋️"],
    ["Pós treino", "🏋️"],
  ])("reconhece a refeição %s", (nome, esperado) => {
    expect(mealIcon(nome)).toBe(esperado);
  });

  it("funciona sem acento", () => {
    expect(mealIcon("cafe da manha")).toBe("☀️");
    expect(mealIcon("almoco")).toBe("🍽️");
  });

  it("usa um ícone genérico para nomes próprios da casa", () => {
    expect(mealIcon("Refeição livre")).toBe("🥣");
  });
});
