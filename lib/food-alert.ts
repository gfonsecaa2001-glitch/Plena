// Cruzamento entre as restrições do paciente e os alimentos do plano.
//
// PARA QUE SERVE — e, principalmente, para que NÃO serve.
//
// Isto é uma REDE DE SEGURANÇA, não uma garantia. Ele pega o esquecimento
// óbvio: você atendeu quatro pacientes seguidos, montou o plano do quinto no
// automático e colocou leite para quem tem intolerância. O que ele NÃO pega:
// ingrediente escondido numa preparação ("bolo" tem trigo, ovo e leite, mas
// o nome não diz), traço de contaminação cruzada, nome comercial de produto.
//
// Por isso o aviso na tela diz "confira" e nunca "está seguro", e nada aqui
// impede o nutricionista de prescrever o que ele decidir prescrever. Quem
// decide é quem tem CRN.

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos: "feijão" → "feijao"
}

// Restrições comuns e os alimentos que as violam.
//
// As listas não tentam ser completas — tentam cobrir o que aparece de fato
// num plano alimentar brasileiro. Um termo que o nutricionista escreva e que
// não esteja aqui ainda funciona: ele é procurado literalmente no alimento
// (quem escreve "kiwi" é avisado sobre kiwi).
const GRUPOS: { termos: string[]; alimentos: string[] }[] = [
  {
    termos: ["lactose", "leite", "laticinio", "laticinios"],
    alimentos: [
      "leite", "queijo", "iogurte", "requeijao", "manteiga", "creme de leite",
      "leite condensado", "coalhada", "ricota", "mussarela", "muçarela",
      "parmesao", "whey", "achocolatado", "doce de leite", "nata", "chantilly",
    ],
  },
  {
    termos: ["gluten", "trigo", "celiaco", "celiaca", "doenca celiaca"],
    alimentos: [
      "trigo", "pao", "macarrao", "massa", "farinha de trigo", "cevada",
      "centeio", "malte", "biscoito", "bolacha", "bolo", "torrada", "cuscuz",
      "lasanha", "pizza", "salgadinho", "cerveja", "farofa", "empanado",
    ],
  },
  {
    termos: ["amendoim", "oleaginosa", "oleaginosas", "castanha", "nozes"],
    alimentos: [
      "amendoim", "pacoca", "pasta de amendoim", "castanha", "castanha de caju",
      "castanha do para", "noz", "nozes", "amendoa", "avela", "pistache", "macadamia",
    ],
  },
  {
    termos: ["frutos do mar", "marisco", "mariscos", "crustaceo", "crustaceos"],
    alimentos: ["camarao", "lula", "polvo", "marisco", "mexilhao", "ostra", "siri", "caranguejo", "lagosta"],
  },
  {
    termos: ["peixe", "peixes"],
    alimentos: ["peixe", "salmao", "atum", "tilapia", "sardinha", "merluza", "bacalhau", "pescada"],
  },
  {
    termos: ["ovo", "ovos"],
    alimentos: ["ovo", "ovos", "clara de ovo", "gema", "omelete", "maionese"],
  },
  {
    termos: ["soja"],
    alimentos: ["soja", "tofu", "shoyu", "proteina de soja", "edamame", "missô", "miso"],
  },
  // Escolhas alimentares. Não são alergia, mas quebram o plano do mesmo jeito
  // — e o nutricionista escreve isso no mesmo campo.
  {
    termos: ["vegetariano", "vegetariana", "vegetarianismo"],
    alimentos: [
      "carne", "frango", "boi", "porco", "peixe", "salmao", "atum", "camarao",
      "bacon", "linguica", "presunto", "salsicha", "bife", "picanha", "costela",
      "patinho", "alcatra", "acem", "lombo", "sobrecoxa", "tilapia", "sardinha",
    ],
  },
  {
    termos: ["vegano", "vegana", "veganismo"],
    alimentos: [
      "carne", "frango", "boi", "porco", "peixe", "salmao", "atum", "camarao",
      "bacon", "linguica", "presunto", "salsicha", "bife", "picanha", "costela",
      "leite", "queijo", "iogurte", "requeijao", "manteiga", "ovo", "ovos",
      "mel", "creme de leite", "whey", "gema", "clara de ovo",
    ],
  },
  {
    termos: ["carne vermelha", "carne de porco", "suino", "suina"],
    alimentos: ["carne", "boi", "bife", "picanha", "alcatra", "patinho", "acem", "costela", "porco", "lombo", "bacon"],
  },
];

// Quebra o que o nutricionista digitou em restrições separadas.
// Aceita vírgula, ponto e vírgula e quebra de linha — que é como as pessoas
// realmente escrevem uma lista.
export function parseRestricoes(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .split(/[,;\n]+/)
    .map((r) => r.trim())
    .filter((r) => r.length >= 3) // "ok", "-", "x" não são restrição
    .slice(0, 30);
}

// Termos de alimento que violam uma restrição.
// Se a restrição não está em nenhum grupo conhecido, ela vira o próprio termo
// de busca — assim "kiwi" ou "pimentao" continuam funcionando.
function alimentosProibidos(restricao: string): string[] {
  const r = normalize(restricao);
  const grupo = GRUPOS.find((g) => g.termos.some((t) => r === t || r.includes(t)));
  return grupo ? grupo.alimentos.map(normalize) : [r];
}

function contem(textoAlimento: string, termo: string): boolean {
  // Palavra inteira (com plural opcional), para "ovo" não casar dentro de
  // "novo" nem "mel" dentro de "melancia" ou "melão".
  const escapado = termo.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`\\b${escapado}s?\\b`).test(textoAlimento);
}

export type Conflito = { restricao: string; alimento: string };

// Cruza as restrições do paciente com os nomes dos alimentos do plano.
// Devolve um conflito por par (restrição, alimento) — sem repetir o mesmo
// alimento para a mesma restrição.
export function detectarConflitos(
  restricoesTexto: string | null | undefined,
  alimentos: string[]
): Conflito[] {
  const restricoes = parseRestricoes(restricoesTexto);
  if (restricoes.length === 0) return [];

  const conflitos: Conflito[] = [];
  const vistos = new Set<string>();

  for (const restricao of restricoes) {
    const proibidos = alimentosProibidos(restricao);
    for (const alimento of alimentos) {
      const alvo = normalize(alimento);
      if (proibidos.some((p) => contem(alvo, p))) {
        const chave = `${normalize(restricao)}|${alvo}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        conflitos.push({ restricao, alimento });
      }
    }
  }

  return conflitos;
}

// Um alimento específico conflita com alguma restrição? Usado para marcar o
// item na lista do plano.
export function conflitosDoAlimento(
  restricoesTexto: string | null | undefined,
  alimento: string
): string[] {
  return detectarConflitos(restricoesTexto, [alimento]).map((c) => c.restricao);
}
