// Reconhece o alimento pelo texto e devolve um ícone.
//
// O nutricionista digita livremente ("2 ovos mexidos", "100g de arroz integral")
// e nós tentamos adivinhar o ícone a partir de palavras-chave. É um "melhor
// esforço": quando não reconhece, cai num ícone neutro de prato — nunca erra
// de forma feia nem impede o cadastro.
//
// A ordem importa: termos mais específicos vêm antes ("batata doce" antes de
// "batata"), senão o genérico ganharia primeiro.

type Rule = { icon: string; terms: string[] };

const RULES: Rule[] = [
  // Proteínas
  { icon: "🥚", terms: ["ovo", "ovos", "clara de ovo", "omelete"] },
  { icon: "🍗", terms: ["frango", "galinha", "peito de frango", "sobrecoxa"] },
  { icon: "🥩", terms: ["carne", "bife", "patinho", "alcatra", "acem", "file", "picanha", "boi"] },
  { icon: "🥓", terms: ["bacon", "linguica", "presunto", "salsicha"] },
  { icon: "🐟", terms: ["peixe", "salmao", "tilapia", "atum", "sardinha", "merluza", "bacalhau"] },
  { icon: "🍤", terms: ["camarao", "frutos do mar", "lula"] },
  { icon: "🌭", terms: ["porco", "lombo", "costela"] },
  { icon: "🫘", terms: ["feijao", "lentilha", "grao de bico", "ervilha", "soja", "leguminosa"] },
  { icon: "🥜", terms: ["amendoim", "castanha", "noz", "nozes", "amendoa", "pasta de amendoim", "oleaginosa"] },
  { icon: "💪", terms: ["whey", "proteina em po", "albumina", "suplemento"] },

  // Carboidratos
  { icon: "🍚", terms: ["arroz"] },
  { icon: "🍠", terms: ["batata doce", "inhame", "cara", "mandioca", "aipim", "macaxeira"] },
  { icon: "🥔", terms: ["batata", "pure"] },
  { icon: "🍝", terms: ["macarrao", "massa", "espaguete", "penne", "talharim", "lasanha"] },
  { icon: "🍞", terms: ["pao", "torrada", "bisnaguinha"] },
  { icon: "🥐", terms: ["croissant", "biscoito", "bolacha", "cracker"] },
  { icon: "🌾", terms: ["aveia", "granola", "quinoa", "cuscuz", "farelo", "chia", "linhaca"] },
  { icon: "🌽", terms: ["milho", "polenta", "pipoca", "tapioca"] },
  { icon: "🥞", terms: ["panqueca", "crepioca", "waffle"] },

  // Frutas
  { icon: "🍌", terms: ["banana"] },
  { icon: "🍎", terms: ["maca"] },
  { icon: "🍊", terms: ["laranja", "tangerina", "mexerica", "bergamota"] },
  { icon: "🍓", terms: ["morango"] },
  { icon: "🍇", terms: ["uva"] },
  { icon: "🍉", terms: ["melancia"] },
  { icon: "🍈", terms: ["melao"] },
  { icon: "🍍", terms: ["abacaxi"] },
  { icon: "🥭", terms: ["manga"] },
  { icon: "🥑", terms: ["abacate", "guacamole"] },
  { icon: "🍐", terms: ["pera"] },
  { icon: "🍑", terms: ["pessego", "ameixa"] },
  { icon: "🥝", terms: ["kiwi"] },
  { icon: "🫐", terms: ["mirtilo", "blueberry", "acai", "frutas vermelhas"] },
  { icon: "🍋", terms: ["limao"] },
  { icon: "🍎", terms: ["fruta", "frutas"] },

  // Vegetais e verduras
  { icon: "🥗", terms: ["salada", "folhas", "alface", "rucula", "agriao", "mix de folhas"] },
  { icon: "🥦", terms: ["brocolis", "couve", "couve-flor", "repolho"] },
  { icon: "🥕", terms: ["cenoura"] },
  { icon: "🍅", terms: ["tomate"] },
  { icon: "🥒", terms: ["pepino", "abobrinha", "chuchu"] },
  { icon: "🧅", terms: ["cebola", "alho"] },
  { icon: "🫑", terms: ["pimentao", "pimenta"] },
  { icon: "🍆", terms: ["berinjela"] },
  { icon: "🎃", terms: ["abobora", "moranga"] },
  { icon: "🍄", terms: ["cogumelo", "shitake", "champignon"] },
  { icon: "🥬", terms: ["espinafre", "acelga", "vegetal", "legume", "verdura"] },

  // Laticínios
  { icon: "🥛", terms: ["leite", "bebida vegetal", "leite de amendoas"] },
  { icon: "🧀", terms: ["queijo", "ricota", "cottage", "mussarela", "requeijao"] },
  { icon: "🍦", terms: ["iogurte", "yogurte", "coalhada"] },
  { icon: "🧈", terms: ["manteiga", "margarina", "ghee"] },

  // Bebidas
  { icon: "💧", terms: ["agua", "hidratacao"] },
  { icon: "☕", terms: ["cafe", "cappuccino", "expresso"] },
  { icon: "🍵", terms: ["cha", "chimarrao", "mate", "infusao"] },
  { icon: "🧃", terms: ["suco", "vitamina", "smoothie", "shake"] },

  // Gorduras e temperos
  { icon: "🫒", terms: ["azeite", "oliva", "azeitona", "oleo"] },
  { icon: "🧂", terms: ["sal", "tempero", "ervas", "canela", "acucar", "mel", "adocante"] },
  { icon: "🥥", terms: ["coco"] },
  { icon: "🍫", terms: ["chocolate", "cacau"] },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos: "feijão" → "feijao"
}

// Ícone de um item de alimento ("2 ovos mexidos" → 🥚)
export function foodIcon(text: string): string {
  const t = normalize(text);
  for (const rule of RULES) {
    for (const term of rule.terms) {
      // \b garante palavra inteira: "pao" não casa dentro de "paozinho"? casa,
      // e tudo bem — mas evita que "cha" case dentro de "chantilly".
      const re = new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}s?\\b`);
      if (re.test(t)) return rule.icon;
    }
  }
  return "🍽️"; // não reconhecido: prato neutro
}

// Ícone da refeição, pelo nome ("Café da manhã" → ☕)
export function mealIcon(name: string): string {
  const t = normalize(name);
  if (/\bcafe da manha\b|\bdesjejum\b|\bcafe\b/.test(t)) return "☀️";
  if (/\balmoco\b/.test(t)) return "🍽️";
  if (/\bjantar\b|\bceia\b|\bnoite\b/.test(t)) return "🌙";
  if (/\bpre[- ]?treino\b|\bpos[- ]?treino\b|\btreino\b/.test(t)) return "🏋️";
  if (/\blanche\b|\bcolacao\b|\bmerenda\b/.test(t)) return "🍎";
  if (/\bceia\b/.test(t)) return "🌛";
  return "🥣";
}
