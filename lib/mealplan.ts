// O conteúdo de um plano alimentar é guardado como JSON na coluna `content`.
// Este arquivo concentra o formato e a leitura/escrita desse JSON, para que o
// resto do código nunca manipule a string diretamente.

// Opção de troca: "no lugar deste alimento, o paciente pode comer aquele".
// A quantidade é calculada para bater as calorias do item original.
export type MealSub = { text: string; foodId: string; grams: number };

export type MealItem = {
  text: string; // o que aparece escrito ("2 ovos mexidos")
  foodId?: string; // vínculo com a tabela de alimentos, quando houver
  grams?: number; // quantidade em gramas — sem ela não há como calcular macros
  subs?: MealSub[]; // substituições oferecidas ao paciente
};

export type MealBlock = {
  name: string; // "Café da manhã"
  time?: string; // "07:30"
  items: MealItem[];
};

// Planos criados antes do cálculo nutricional guardavam os itens como texto
// puro (`items: string[]`). Normalizamos aqui para o formato novo — assim
// nenhum plano antigo quebra, e eles seguem editáveis.
function normalizeItem(raw: unknown): MealItem | null {
  if (typeof raw === "string") return { text: raw };
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : null;
    if (!text) return null;
    const subs = Array.isArray(o.subs)
      ? (o.subs
          .map((s: unknown) => {
            if (!s || typeof s !== "object") return null;
            const x = s as Record<string, unknown>;
            if (typeof x.text !== "string" || typeof x.foodId !== "string") return null;
            if (typeof x.grams !== "number" || !isFinite(x.grams)) return null;
            return { text: x.text, foodId: x.foodId, grams: x.grams };
          })
          .filter(Boolean) as MealSub[])
      : undefined;

    return {
      text,
      foodId: typeof o.foodId === "string" ? o.foodId : undefined,
      grams: typeof o.grams === "number" && isFinite(o.grams) ? o.grams : undefined,
      ...(subs && subs.length ? { subs } : {}),
    };
  }
  return null;
}

export function parseMeals(content: string): MealBlock[] {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) return [];
    return data
      .filter((m) => m && typeof m === "object" && typeof m.name === "string")
      .map((m) => ({
        name: m.name as string,
        time: typeof m.time === "string" ? m.time : undefined,
        items: Array.isArray(m.items)
          ? (m.items.map(normalizeItem).filter(Boolean) as MealItem[])
          : [],
      }));
  } catch {
    return [];
  }
}

export function serializeMeals(meals: MealBlock[]): string {
  return JSON.stringify(meals);
}
