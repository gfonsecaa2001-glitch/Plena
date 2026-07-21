// O conteúdo de um plano alimentar é guardado como JSON na coluna `content`.
// Este arquivo concentra o formato e a leitura/escrita desse JSON, para que o
// resto do código nunca manipule a string diretamente.

export type MealBlock = {
  name: string; // "Café da manhã"
  time?: string; // "07:30"
  items: string[]; // ["2 ovos mexidos", "1 fatia de pão integral"]
};

export function parseMeals(content: string): MealBlock[] {
  try {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function serializeMeals(meals: MealBlock[]): string {
  return JSON.stringify(meals);
}
