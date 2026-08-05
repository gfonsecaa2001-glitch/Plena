// Leitura da planilha de pacientes.
//
// Este arquivo roda nos DOIS lados: no navegador, para mostrar a prévia antes
// de gravar; e no servidor, que recebe o texto original e refaz a leitura.
// É de propósito — se a prévia usasse uma lógica e a gravação outra, o
// nutricionista aprovaria uma coisa e o sistema salvaria outra.

import { parseDateInput } from "./datetime";

// ---------- Leitura bruta ----------

// Colar do Excel ou do Google Planilhas produz TAB; exportar como CSV produz
// vírgula (ou ponto e vírgula, no Excel em português). Detectamos em vez de
// exigir que o nutricionista saiba a diferença.
export function detectDelimiter(text: string): string {
  const primeiraLinha = text.split(/\r?\n/)[0] ?? "";
  const candidatos = ["\t", ";", ","];
  let melhor = ",";
  let maxOcorrencias = 0;
  for (const d of candidatos) {
    const n = primeiraLinha.split(d).length - 1;
    if (n > maxOcorrencias) {
      maxOcorrencias = n;
      melhor = d;
    }
  }
  return melhor;
}

// Parser de CSV de verdade: campo entre aspas pode conter o delimitador, quebra
// de linha e aspas duplicadas (""). Um `split(",")` quebraria em
// "Silva, Maria" — que é exatamente como meio mundo escreve nome em planilha.
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const d = delimiter ?? detectDelimiter(text);
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          campo += '"'; // aspas escapada
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
    } else if (c === d) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c === "\r") {
      // ignora: o \n seguinte fecha a linha
    } else {
      campo += c;
    }
  }

  // Último campo/linha, quando o arquivo não termina em quebra de linha.
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  // Linhas totalmente vazias não são dado — planilha costuma ter várias no fim.
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

// ---------- Mapeamento de colunas ----------

export type CampoPaciente =
  | "name"
  | "email"
  | "phone"
  | "birthDate"
  | "sex"
  | "goal"
  | "restrictions"
  | "anamnesis";

// Cada campo aceita os nomes que as pessoas realmente usam no cabeçalho.
// Exigir um formato exato faria o nutricionista editar a planilha antes de
// importar — que é justamente o trabalho que queremos poupar.
const SINONIMOS: { campo: CampoPaciente; nomes: string[] }[] = [
  { campo: "name", nomes: ["nome", "name", "paciente", "nome completo", "nome do paciente"] },
  { campo: "email", nomes: ["email", "e-mail", "mail", "correio"] },
  { campo: "phone", nomes: ["telefone", "celular", "fone", "whatsapp", "whats", "contato", "tel"] },
  {
    campo: "birthDate",
    nomes: ["nascimento", "data de nascimento", "dt nascimento", "data nascimento", "aniversario", "nasc"],
  },
  { campo: "sex", nomes: ["sexo", "genero"] },
  { campo: "goal", nomes: ["objetivo", "meta", "queixa"] },
  {
    campo: "restrictions",
    nomes: ["restricoes", "restricao", "alergias", "alergia", "intolerancias", "intolerancia"],
  },
  { campo: "anamnesis", nomes: ["observacoes", "observacao", "obs", "anamnese", "notas", "historico"] },
];

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type Mapeamento = { indice: number; campo: CampoPaciente | null; original: string };

export function mapearColunas(cabecalho: string[]): Mapeamento[] {
  const usados = new Set<CampoPaciente>();
  return cabecalho.map((original, indice) => {
    const h = normalizeHeader(original);
    // Os sinônimos passam pela MESMA normalização do cabeçalho — senão
    // "E-mail" (que vira "e mail") nunca casaria com "e-mail" da lista.
    const achado = SINONIMOS.find(
      (s) =>
        !usados.has(s.campo) &&
        s.nomes.map(normalizeHeader).some((n) => h === n || h.startsWith(n))
    );
    if (achado) usados.add(achado.campo);
    return { indice, campo: achado?.campo ?? null, original };
  });
}

// ---------- Conversão de valores ----------

// Planilha brasileira escreve 25/03/1990; exportação de sistema escreve
// 1990-03-25. Aceitamos os dois e recusamos o resto — data errada num
// prontuário é pior que data ausente.
export function parseDataPtBr(valor: string): Date | null {
  const v = valor.trim();
  if (!v) return null;

  const br = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (br) {
    let [, d, m, a] = br;
    if (a.length === 2) a = Number(a) > 30 ? `19${a}` : `20${a}`;
    const iso = `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return validaISO(iso);
  }

  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, a, m, d] = iso;
    return validaISO(`${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }

  return null;
}

function validaISO(iso: string): Date | null {
  const data = parseDateInput(iso);
  if (Number.isNaN(data.getTime())) return null;
  // Rejeita 31/02 e afins: o JS "conserta" silenciosamente para 03/03.
  const [a, m, d] = iso.split("-").map(Number);
  const conferencia = data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  if (conferencia !== `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`) return null;
  // Data de nascimento no futuro ou absurda é erro de digitação.
  const ano = a;
  if (ano < 1900 || data.getTime() > Date.now()) return null;
  return data;
}

export function parseSexo(valor: string): string | null {
  const v = valor.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith("f")) return "F";
  if (v.startsWith("m")) return "M";
  return "Outro";
}

// ---------- Leitura completa ----------

export type PacienteImportado = {
  linha: number; // número da linha na planilha, para o nutricionista achar
  name: string;
  email: string | null;
  phone: string | null;
  birthDate: Date | null;
  sex: string | null;
  goal: string | null;
  restrictions: string | null;
  anamnesis: string | null;
  avisos: string[]; // problemas que NÃO impedem a importação
};

export type ErroImportacao = { linha: number; motivo: string; conteudo: string };

export type LeituraPlanilha = {
  colunas: Mapeamento[];
  pacientes: PacienteImportado[];
  erros: ErroImportacao[];
};

function limpa(v: string | undefined, max = 500): string | null {
  const s = v?.trim().slice(0, max);
  return s ? s : null;
}

export function lerPlanilha(texto: string): LeituraPlanilha {
  const linhas = parseDelimited(texto);
  if (linhas.length === 0) return { colunas: [], pacientes: [], erros: [] };

  const colunas = mapearColunas(linhas[0]);
  const temNome = colunas.some((c) => c.campo === "name");

  // Sem coluna de nome não dá para importar ninguém — e é o engano mais
  // comum: colar os dados sem a linha de cabeçalho.
  if (!temNome) {
    return {
      colunas,
      pacientes: [],
      erros: [
        {
          linha: 1,
          motivo: "Nenhuma coluna de nome encontrada. A primeira linha precisa ser o cabeçalho.",
          conteudo: linhas[0].join(" | "),
        },
      ],
    };
  }

  const porCampo = (l: string[], campo: CampoPaciente): string | undefined => {
    const c = colunas.find((x) => x.campo === campo);
    return c ? l[c.indice] : undefined;
  };

  const pacientes: PacienteImportado[] = [];
  const erros: ErroImportacao[] = [];
  // Repetição DENTRO do próprio arquivo é comum (planilha que virou histórico,
  // uma linha por consulta). Descontamos aqui para a prévia mostrar o número
  // real — prometer 7 e gravar 5 faria o nutricionista achar que algo falhou.
  const chavesVistas = new Set<string>();

  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i];
    const numeroDaLinha = i + 1; // 1-based, contando o cabeçalho
    const name = limpa(porCampo(l, "name"), 120);

    if (!name) {
      erros.push({ linha: numeroDaLinha, motivo: "sem nome", conteudo: l.join(" | ") });
      continue;
    }

    const email = limpa(porCampo(l, "email"), 200);
    const phone = limpa(porCampo(l, "phone"), 40);

    if (jaVisto(chavesVistas, chavesDuplicidade(name, phone, email))) {
      erros.push({
        linha: numeroDaLinha,
        motivo: "repetido nesta planilha",
        conteudo: l.join(" | "),
      });
      continue;
    }

    const avisos: string[] = [];

    const dataTexto = porCampo(l, "birthDate")?.trim();
    const birthDate = dataTexto ? parseDataPtBr(dataTexto) : null;
    // Data ilegível não descarta a pessoa — o nome e o telefone valem mais que
    // o aniversário. Avisamos e importamos sem a data.
    if (dataTexto && !birthDate) avisos.push(`data "${dataTexto}" não reconhecida`);

    const sexoTexto = porCampo(l, "sex")?.trim();
    const sex = sexoTexto ? parseSexo(sexoTexto) : null;

    pacientes.push({
      linha: numeroDaLinha,
      name,
      email,
      phone,
      birthDate,
      sex,
      goal: limpa(porCampo(l, "goal"), 200),
      restrictions: limpa(porCampo(l, "restrictions"), 500),
      anamnesis: limpa(porCampo(l, "anamnesis"), 5000),
      avisos,
    });
  }

  return { colunas, pacientes, erros };
}

// Chaves de comparação para não cadastrar a mesma pessoa duas vezes — dentro
// do próprio arquivo e contra quem já está no sistema.
//
// Cada pessoa gera uma chave POR CONTATO, e duas pessoas são a mesma se
// qualquer chave coincidir. Uma chave única com nome+telefone+e-mail juntos
// não serve: a ficha antiga costuma ter só o telefone, a planilha traz
// telefone e e-mail, e as duas deixariam de casar — que é exatamente como
// esta função errava antes.
export function chavesDuplicidade(
  name: string,
  phone: string | null,
  email: string | null
): string[] {
  const n = name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  const chaves: string[] = [];

  // Últimos 8 dígitos: ignora DDI e DDD anotados de formas diferentes.
  const t = (phone ?? "").replace(/\D/g, "").slice(-8);
  if (t.length === 8) chaves.push(`${n}|tel:${t}`);

  const e = (email ?? "").trim().toLowerCase();
  if (e) chaves.push(`${n}|mail:${e}`);

  // Sem contato nenhum, só o nome sobra como identidade.
  if (chaves.length === 0) chaves.push(`${n}|sem-contato`);

  return chaves;
}

// Já vi esta pessoa? Registra as chaves dela no conjunto e diz se alguma
// já estava lá.
export function jaVisto(vistos: Set<string>, chaves: string[]): boolean {
  const repetido = chaves.some((c) => vistos.has(c));
  for (const c of chaves) vistos.add(c);
  return repetido;
}
