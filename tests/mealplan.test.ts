import { describe, it, expect } from "vitest";
import { parseMeals, serializeMeals } from "@/lib/mealplan";

// Planos criados antes do cálculo nutricional guardavam os itens como texto
// puro. Se a leitura quebrar, o nutricionista perde o plano do paciente — por
// isso este arquivo cobre os dois formatos e as entradas corrompidas.

describe("parseMeals — formato antigo (itens em texto puro)", () => {
  it("converte strings para o formato novo", () => {
    const antigo = JSON.stringify([
      { name: "Café da manhã", time: "07:30", items: ["2 ovos", "1 pão"] },
    ]);
    const meals = parseMeals(antigo);
    expect(meals).toHaveLength(1);
    expect(meals[0].items).toEqual([{ text: "2 ovos" }, { text: "1 pão" }]);
  });

  it("mantém nome e horário", () => {
    const antigo = JSON.stringify([{ name: "Almoço", time: "12:00", items: ["Arroz"] }]);
    expect(parseMeals(antigo)[0]).toMatchObject({ name: "Almoço", time: "12:00" });
  });
});

describe("parseMeals — formato novo (com alimento e quantidade)", () => {
  it("preserva o vínculo com o alimento e os gramas", () => {
    const novo = JSON.stringify([
      {
        name: "Almoço",
        items: [{ text: "150 g de Frango", foodId: "abc123", grams: 150 }],
      },
    ]);
    expect(parseMeals(novo)[0].items[0]).toEqual({
      text: "150 g de Frango",
      foodId: "abc123",
      grams: 150,
    });
  });

  it("aceita itens de texto livre misturados com calculados", () => {
    const misto = JSON.stringify([
      {
        name: "Jantar",
        items: [
          { text: "150 g de Frango", foodId: "abc", grams: 150 },
          { text: "Salada à vontade" },
        ],
      },
    ]);
    const items = parseMeals(misto)[0].items;
    expect(items[0].foodId).toBe("abc");
    expect(items[1].foodId).toBeUndefined();
  });
});

describe("parseMeals — substituições", () => {
  it("preserva as opções de troca de um item", () => {
    const json = JSON.stringify([
      {
        name: "Almoço",
        items: [
          {
            text: "100 g de Arroz",
            foodId: "arroz",
            grams: 100,
            subs: [{ text: "130 g de Batata doce", foodId: "batata", grams: 130 }],
          },
        ],
      },
    ]);
    expect(parseMeals(json)[0].items[0].subs).toEqual([
      { text: "130 g de Batata doce", foodId: "batata", grams: 130 },
    ]);
  });

  it("descarta substituições malformadas sem perder o item", () => {
    const json = JSON.stringify([
      {
        name: "Almoço",
        items: [
          {
            text: "100 g de Arroz",
            foodId: "arroz",
            grams: 100,
            subs: [
              { text: "ok", foodId: "x", grams: 50 },
              { text: "sem gramas", foodId: "y" },
              { foodId: "z", grams: 10 },
              null,
            ],
          },
        ],
      },
    ]);
    const item = parseMeals(json)[0].items[0];
    expect(item.text).toBe("100 g de Arroz");
    expect(item.subs).toEqual([{ text: "ok", foodId: "x", grams: 50 }]);
  });

  it("item sem substituição não ganha o campo", () => {
    const json = JSON.stringify([{ name: "Café", items: [{ text: "Ovo" }] }]);
    expect(parseMeals(json)[0].items[0].subs).toBeUndefined();
  });
});

describe("parseMeals — entradas inválidas não podem derrubar a página", () => {
  it.each([
    ["JSON quebrado", "{ isso não é json"],
    ["JSON que não é lista", '{"name":"x"}'],
    ["texto vazio", ""],
    ["lista vazia", "[]"],
  ])("devolve lista vazia para %s", (_caso, entrada) => {
    expect(parseMeals(entrada)).toEqual([]);
  });

  it("descarta refeições sem nome", () => {
    const ruim = JSON.stringify([{ time: "08:00", items: ["x"] }, { name: "Almoço", items: [] }]);
    const meals = parseMeals(ruim);
    expect(meals).toHaveLength(1);
    expect(meals[0].name).toBe("Almoço");
  });

  it("descarta itens sem texto e ignora gramas inválidos", () => {
    const ruim = JSON.stringify([
      {
        name: "Café",
        items: [{ foodId: "sem-texto" }, null, 42, { text: "ok", grams: "muito" }],
      },
    ]);
    const items = parseMeals(ruim)[0].items;
    expect(items).toEqual([{ text: "ok", foodId: undefined, grams: undefined }]);
  });

  it("trata items ausente como refeição sem alimentos", () => {
    expect(parseMeals(JSON.stringify([{ name: "Ceia" }]))[0].items).toEqual([]);
  });
});

describe("ida e volta", () => {
  it("serializar e ler de volta preserva o conteúdo", () => {
    const meals = [
      { name: "Café da manhã", time: "07:30", items: [{ text: "2 ovos", foodId: "a", grams: 100 }] },
    ];
    expect(parseMeals(serializeMeals(meals))).toEqual(meals);
  });
});
