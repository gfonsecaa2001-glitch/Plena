// Cálculos de nutrição.
//
// FONTES DAS FÓRMULAS
// - TMB (Taxa Metabólica Basal): energia gasta em repouso absoluto.
//   • Mifflin-St Jeor (1990) — a mais precisa para a população geral e a
//     recomendada pela Academy of Nutrition and Dietetics. É o nosso padrão.
//   • Harris-Benedict revisada (Roza & Shizgal, 1984) — clássica, mostrada
//     ao lado para o nutricionista comparar.
// - GET (Gasto Energético Total) = TMB × fator de atividade.
//
// IMPORTANTE: estas fórmulas ESTIMAM o gasto. A prescrição final é decisão
// clínica do nutricionista — por isso a meta (kcalTarget) é um campo editável,
// nunca preenchido automaticamente.

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: "Sedentário", hint: "pouco ou nenhum exercício" },
  { value: 1.375, label: "Levemente ativo", hint: "exercício leve 1–3×/semana" },
  { value: 1.55, label: "Moderadamente ativo", hint: "exercício moderado 3–5×/semana" },
  { value: 1.725, label: "Muito ativo", hint: "exercício intenso 6–7×/semana" },
  { value: 1.9, label: "Extremamente ativo", hint: "atleta ou trabalho físico pesado" },
] as const;

export function ageFrom(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const years = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000);
  return years > 0 && years < 130 ? Math.floor(years) : null;
}

export type EnergyInput = {
  sex: string | null;
  ageYears: number | null;
  weightKg: number | null;
  heightCm: number | null;
  activityLevel: number | null;
};

export type EnergyResult = {
  mifflin: number;
  harris: number;
  get: number; // pelo Mifflin, que é o nosso padrão
  activityLevel: number;
};

// Retorna null quando falta algum dado — a tela usa isso para explicar
// exatamente o que precisa ser preenchido, em vez de mostrar número errado.
export function calcEnergy(input: EnergyInput): EnergyResult | null {
  const { sex, ageYears, weightKg, heightCm } = input;
  if (!ageYears || !weightKg || !heightCm) return null;
  if (sex !== "F" && sex !== "M") return null; // as fórmulas exigem sexo biológico

  const male = sex === "M";

  // Mifflin-St Jeor: (10 × peso) + (6.25 × altura) − (5 × idade) + s
  const mifflin =
    10 * weightKg + 6.25 * heightCm - 5 * ageYears + (male ? 5 : -161);

  // Harris-Benedict revisada (Roza & Shizgal, 1984)
  const harris = male
    ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears
    : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears;

  const activityLevel = input.activityLevel ?? 1.55;

  return {
    mifflin: Math.round(mifflin),
    harris: Math.round(harris),
    get: Math.round(mifflin * activityLevel),
    activityLevel,
  };
}

// ---------- Somatório de macros do plano alimentar ----------

export type Macros = { kcal: number; protein: number; carb: number; fat: number };

export const ZERO: Macros = { kcal: 0, protein: 0, carb: 0, fat: 0 };

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carb: a.carb + b.carb,
    fat: a.fat + b.fat,
  };
}

// Os valores da tabela são por 100 g — daí a regra de três.
export function macrosFor(
  food: { kcal: number; proteinG: number; carbG: number; fatG: number },
  grams: number
): Macros {
  const f = grams / 100;
  return {
    kcal: food.kcal * f,
    protein: food.proteinG * f,
    carb: food.carbG * f,
    fat: food.fatG * f,
  };
}

export function roundMacros(m: Macros): Macros {
  return {
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein * 10) / 10,
    carb: Math.round(m.carb * 10) / 10,
    fat: Math.round(m.fat * 10) / 10,
  };
}

// Distribuição percentual de calorias entre os macros (4/4/9 kcal por grama).
export function macroSplit(m: Macros) {
  const kcalP = m.protein * 4;
  const kcalC = m.carb * 4;
  const kcalF = m.fat * 9;
  const total = kcalP + kcalC + kcalF;
  if (total <= 0) return { protein: 0, carb: 0, fat: 0 };
  return {
    protein: Math.round((kcalP / total) * 100),
    carb: Math.round((kcalC / total) * 100),
    fat: Math.round((kcalF / total) * 100),
  };
}
