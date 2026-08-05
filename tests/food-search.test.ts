import { describe, it, expect } from "vitest";
import { buildFoodSearch } from "@/lib/food-search";

// Bug real que motivou este arquivo: os nomes da TACO têm vírgula
// ("Arroz, integral, cozido"). Buscar a frase inteira não achava nada, e o
// nutricionista que digitava "arroz integral" recebia zero resultados.

// Simula o `contains` do banco sobre um nome, para conferir o casamento.
function casa(nome: string, query: string): boolean {
  const where = buildFoodSearch(query);
  if (!where) return false;
  return where.AND.every((c) => nome.toLowerCase().includes(c.name.contains.toLowerCase()));
}

describe("buildFoodSearch", () => {
  it("acha nomes da TACO escritos com vírgula", () => {
    expect(casa("Arroz, integral, cozido", "arroz integral")).toBe(true);
    expect(casa("Batata, doce, cozida", "batata doce")).toBe(true);
    expect(casa("Frango, peito, sem pele, grelhado", "frango peito grelhado")).toBe(true);
  });

  it("a ordem das palavras não importa", () => {
    expect(casa("Arroz, integral, cozido", "integral arroz")).toBe(true);
  });

  it("exige TODAS as palavras — não basta uma", () => {
    expect(casa("Arroz, tipo 1, cozido", "arroz integral")).toBe(false);
    expect(casa("Batata, baroa, cozida", "batata doce")).toBe(false);
  });

  it("uma palavra só continua funcionando", () => {
    expect(casa("Arroz, integral, cozido", "arroz")).toBe(true);
  });

  it("ignora vírgulas digitadas pelo usuário", () => {
    expect(casa("Arroz, integral, cozido", "arroz, integral")).toBe(true);
  });

  it("descarta palavras curtas que não filtram nada", () => {
    const where = buildFoodSearch("pao de forma");
    expect(where?.AND.map((c) => c.name.contains)).toEqual(["pao", "forma"]);
  });

  it("busca vazia ou só com palavras curtas não vira consulta", () => {
    expect(buildFoodSearch("")).toBeNull();
    expect(buildFoodSearch("  ")).toBeNull();
    expect(buildFoodSearch("a e")).toBeNull();
  });

  it("limita a quantidade de termos", () => {
    const where = buildFoodSearch("um dois tres quatro cinco seis sete oito");
    expect(where!.AND.length).toBeLessThanOrEqual(6);
  });

  it("sempre busca sem diferenciar maiúsculas", () => {
    const where = buildFoodSearch("ARROZ Integral");
    expect(where!.AND.every((c) => c.name.mode === "insensitive")).toBe(true);
  });
});
