import { describe, it, expect } from "vitest";
import { parseRestricoes, detectarConflitos, conflitosDoAlimento } from "@/lib/food-alert";

describe("parseRestricoes", () => {
  it("aceita a lista do jeito que as pessoas escrevem", () => {
    expect(parseRestricoes("lactose, glúten; amendoim\nfrutos do mar")).toEqual([
      "lactose",
      "glúten",
      "amendoim",
      "frutos do mar",
    ]);
  });

  it("ignora restos que não são restrição", () => {
    expect(parseRestricoes("lactose, -, x, ok")).toEqual(["lactose"]);
    expect(parseRestricoes("")).toEqual([]);
    expect(parseRestricoes(null)).toEqual([]);
  });
});

describe("detectarConflitos", () => {
  it("pega o esquecimento clássico: leite para intolerante a lactose", () => {
    const c = detectarConflitos("intolerância à lactose", [
      "200 ml de Leite, integral",
      "150 g de Arroz, integral, cozido",
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].alimento).toContain("Leite");
  });

  it("reconhece o grupo inteiro, não só a palavra digitada", () => {
    const alimentos = ["Queijo, mussarela", "Iogurte, natural", "Requeijão cremoso"];
    expect(detectarConflitos("lactose", alimentos)).toHaveLength(3);
  });

  it("pega glúten em pão e macarrão", () => {
    const c = detectarConflitos("doença celíaca", ["Pão, trigo, forma", "Macarrão, cozido"]);
    expect(c).toHaveLength(2);
  });

  it("vegetariano conflita com carne, mas não com feijão", () => {
    const c = detectarConflitos("vegetariana", [
      "120 g de Frango, peito, grelhado",
      "100 g de Feijão, carioca, cozido",
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].alimento).toContain("Frango");
  });

  it("vegano conflita também com leite, ovo e mel", () => {
    const c = detectarConflitos("vegano", [
      "Leite, integral",
      "Ovo, de galinha, inteiro",
      "Mel de abelha",
      "Arroz, integral, cozido",
    ]);
    expect(c).toHaveLength(3);
  });

  it("funciona com restrição que não está em nenhum grupo conhecido", () => {
    const c = detectarConflitos("kiwi", ["Kiwi, cru", "Banana, prata, crua"]);
    expect(c).toHaveLength(1);
    expect(c[0].alimento).toContain("Kiwi");
  });

  it("não repete o mesmo alimento para a mesma restrição", () => {
    // "leite" e "lactose" caem no MESMO grupo; o alimento aparece uma vez só
    // por restrição, mas as duas restrições são reportadas.
    const c = detectarConflitos("lactose", ["Leite, integral", "Leite, integral"]);
    expect(c).toHaveLength(1);
  });

  it("sem restrição, não inventa alerta", () => {
    expect(detectarConflitos(null, ["Leite, integral"])).toEqual([]);
    expect(detectarConflitos("", ["Leite, integral"])).toEqual([]);
  });
});

// Falso positivo é pior que silêncio aqui: se o sistema gritar por qualquer
// coisa, o nutricionista aprende a ignorar o aviso — e aí ele não serve para
// nada no dia em que estiver certo.
describe("falsos positivos", () => {
  it("'ovo' não casa dentro de 'novo'", () => {
    expect(detectarConflitos("ovo", ["Produto novo da marca"])).toEqual([]);
  });

  it("'mel' não casa dentro de 'melancia' nem 'melão'", () => {
    expect(detectarConflitos("vegano", ["Melancia, crua", "Melão, cru"])).toEqual([]);
  });

  it("'leite' casa em 'creme de leite' (é para casar mesmo)", () => {
    expect(detectarConflitos("lactose", ["Creme de leite"])).toHaveLength(1);
  });

  it("plural conta: 'ovos mexidos' viola restrição a ovo", () => {
    expect(detectarConflitos("ovo", ["2 ovos mexidos"])).toHaveLength(1);
  });
});

describe("conflitosDoAlimento", () => {
  it("devolve quais restrições um alimento viola", () => {
    expect(conflitosDoAlimento("lactose, vegetariano", "Queijo, mussarela")).toEqual([
      "lactose",
    ]);
    expect(conflitosDoAlimento("lactose, vegetariano", "Frango, peito")).toEqual([
      "vegetariano",
    ]);
  });

  it("um alimento pode violar mais de uma restrição", () => {
    expect(conflitosDoAlimento("lactose, vegano", "Leite, integral")).toHaveLength(2);
  });

  it("alimento liberado não devolve nada", () => {
    expect(conflitosDoAlimento("lactose, glúten", "Arroz, integral, cozido")).toEqual([]);
  });
});
