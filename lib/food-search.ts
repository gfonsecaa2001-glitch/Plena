// Monta a condição de busca de alimentos.
//
// POR QUE ISTO EXISTE: os nomes da TACO são escritos com vírgulas —
// "Arroz, integral, cozido", "Batata, doce, cozida". Procurar a frase inteira
// ("arroz integral") não encontra nada, porque essa sequência literal não
// existe no nome. Quem digita do jeito natural recebia zero resultados.
//
// Solução: cada palavra vira uma condição, e todas precisam aparecer no nome
// (em qualquer ordem). "arroz integral" e "integral arroz" acham o mesmo.

export type FoodWhere = { AND: { name: { contains: string; mode: "insensitive" } }[] };

// Conectivos que a pessoa digita mas que a TACO não usa no nome. Exigi-los
// quebraria a busca: "pão de forma" não acha "Pão, trigo, forma, integral",
// porque ali não existe a palavra "de".
//
// "com" e "sem" ficam de fora desta lista de propósito — na TACO eles
// distinguem alimentos de verdade ("Frango, peito, COM pele" × "SEM pele").
const CONECTIVOS = new Set([
  "de", "da", "do", "das", "dos",
  "e", "a", "o", "as", "os",
  "em", "na", "no", "nas", "nos", "ao", "aos",
  "um", "uma",
]);

export function buildFoodSearch(query: string): FoodWhere | null {
  const palavras = query
    .trim()
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((p) => p.length >= 2 && !CONECTIVOS.has(p))
    .slice(0, 6); // buscas absurdamente longas não fazem sentido

  if (palavras.length === 0) return null;

  return {
    AND: palavras.map((p) => ({ name: { contains: p, mode: "insensitive" as const } })),
  };
}
