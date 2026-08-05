// Percentual de gordura a partir de dobras cutâneas (adipômetro).
//
// A balança de bioimpedância de consultório varia com hidratação e horário;
// as dobras, medidas pela mesma pessoa com o mesmo protocolo, são o método
// que os cursos de nutrição no Brasil ensinam como padrão de acompanhamento.
//
// Como funciona: as equações de Jackson & Pollock estimam a DENSIDADE
// CORPORAL a partir da soma das dobras, da idade e do sexo. Depois, a fórmula
// de Siri converte densidade em percentual de gordura. Faulkner é diferente —
// vai direto da soma para o percentual, sem passar pela densidade.
//
// Referências:
//   Jackson & Pollock (1978) — homens; Jackson, Pollock & Ward (1980) — mulheres
//   Siri (1961); Faulkner (1968)

export type Protocolo = "pollock7" | "pollock3" | "faulkner";

export type Dobras = {
  tricepsMm?: number | null;
  subscapularMm?: number | null;
  suprailiacMm?: number | null;
  abdominalMm?: number | null;
  thighMm?: number | null;
  chestMm?: number | null;
  midaxillaryMm?: number | null;
};

export type DobraKey = keyof Dobras;

export const NOMES: Record<DobraKey, string> = {
  tricepsMm: "Tríceps",
  subscapularMm: "Subescapular",
  suprailiacMm: "Suprailíaca",
  abdominalMm: "Abdominal",
  thighMm: "Coxa",
  chestMm: "Peitoral",
  midaxillaryMm: "Axilar média",
};

// Quais dobras cada protocolo exige. O Pollock de 3 pede pontos DIFERENTES
// para homens e mulheres — não é uma simplificação nossa, é a equação: cada
// versão foi validada com aqueles pontos específicos.
export const PROTOCOLOS: {
  id: Protocolo;
  label: string;
  descricao: string;
  dobras: (sex: string | null | undefined) => DobraKey[];
}[] = [
  {
    id: "pollock7",
    label: "Pollock 7 dobras",
    descricao: "O mais preciso. Exige as sete medidas.",
    dobras: () => [
      "chestMm",
      "midaxillaryMm",
      "tricepsMm",
      "subscapularMm",
      "abdominalMm",
      "suprailiacMm",
      "thighMm",
    ],
  },
  {
    id: "pollock3",
    label: "Pollock 3 dobras",
    descricao: "Versão rápida, com pontos diferentes para homens e mulheres.",
    dobras: (sex) =>
      isMasculino(sex)
        ? ["chestMm", "abdominalMm", "thighMm"]
        : ["tricepsMm", "suprailiacMm", "thighMm"],
  },
  {
    id: "faulkner",
    label: "Faulkner 4 dobras",
    descricao: "Comum com atletas. Não usa idade nem sexo.",
    dobras: () => ["tricepsMm", "subscapularMm", "suprailiacMm", "abdominalMm"],
  },
];

function isMasculino(sex: string | null | undefined): boolean {
  return (sex ?? "").trim().toUpperCase().startsWith("M");
}

// Soma as dobras exigidas. Devolve null se faltar QUALQUER uma — uma soma
// parcial produziria um percentual plausível e completamente errado, o que é
// pior que não mostrar nada.
function somar(dobras: Dobras, chaves: DobraKey[]): number | null {
  let total = 0;
  for (const chave of chaves) {
    const valor = dobras[chave];
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) return null;
    total += valor;
  }
  return total;
}

// Siri (1961): densidade corporal → percentual de gordura.
function siri(densidade: number): number {
  return 495 / densidade - 450;
}

// Calcula o percentual de gordura. Devolve null quando faltam dados —
// mesma regra do resto do sistema: melhor um traço na tela que um número
// inventado num documento clínico.
export function bodyFatFromSkinfolds(
  protocolo: Protocolo,
  dobras: Dobras,
  sex: string | null | undefined,
  age: number | null | undefined
): number | null {
  const config = PROTOCOLOS.find((p) => p.id === protocolo);
  if (!config) return null;

  const soma = somar(dobras, config.dobras(sex));
  if (soma === null) return null;

  // Faulkner é direto: não depende de idade nem de sexo.
  if (protocolo === "faulkner") {
    return arredondar(soma * 0.153 + 5.783);
  }

  // Pollock precisa dos dois. Sem idade ou sexo, a equação não se aplica.
  if (!age || age <= 0 || !sex) return null;
  const homem = isMasculino(sex);

  let densidade: number;
  if (protocolo === "pollock7") {
    densidade = homem
      ? 1.112 - 0.00043499 * soma + 0.00000055 * soma * soma - 0.00028826 * age
      : 1.097 - 0.00046971 * soma + 0.00000056 * soma * soma - 0.00012828 * age;
  } else {
    densidade = homem
      ? 1.10938 - 0.0008267 * soma + 0.0000016 * soma * soma - 0.0002574 * age
      : 1.0994921 - 0.0009929 * soma + 0.0000023 * soma * soma - 0.0001392 * age;
  }

  const pct = siri(densidade);

  // Fora dessa faixa, a medição foi feita errado (dobra anotada em cm em vez
  // de mm, ponto trocado). Devolver "3%" ou "70%" daria ar de precisão a um
  // erro de digitação.
  if (!Number.isFinite(pct) || pct < 2 || pct > 60) return null;

  return arredondar(pct);
}

function arredondar(v: number): number {
  return Math.round(v * 10) / 10;
}

// Classificação do percentual de gordura (ACSM). Serve para o nutricionista
// ter uma referência na tela — a leitura clínica continua sendo dele.
export function classificar(pct: number, sex: string | null | undefined): string {
  const faixas = isMasculino(sex)
    ? [
        [6, "abaixo do essencial"],
        [14, "atlético"],
        [18, "bom"],
        [25, "aceitável"],
      ]
    : [
        [14, "abaixo do essencial"],
        [21, "atlético"],
        [25, "bom"],
        [32, "aceitável"],
      ];

  for (const [limite, rotulo] of faixas as [number, string][]) {
    if (pct < limite) return rotulo;
  }
  return "acima do recomendado";
}

// Idade em anos a partir da data de nascimento — as equações de Pollock
// usam idade cronológica, então precisa ser exata o suficiente.
export function idadeEm(birthDate: Date | null | undefined, ref: Date): number | null {
  if (!birthDate) return null;
  const anos = (ref.getTime() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000);
  return anos > 0 && anos < 120 ? Math.floor(anos) : null;
}
