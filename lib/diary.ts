// Recordatório alimentar: o que o paciente realmente comeu.
//
// O CRM sabia o que o nutricionista PRESCREVE. Isto traz o outro lado — e é
// o dado que sustenta o ajuste da consulta seguinte.
//
// O paciente escreve em TEXTO LIVRE ("2 pães com manteiga e café com leite").
// Foi decisão consciente: obrigar leigo a procurar alimento numa tabela de
// composição derrubaria a taxa de resposta a quase zero, e um recordatório
// não preenchido não vale nada. Quem interpreta é o nutricionista.

import { TZ } from "./datetime";

const OFFSET = "-03:00";

// As refeições que aparecem no formulário. Cobrem o dia de quem come de 3 em
// 3 horas e de quem faz duas refeições — quem não usa uma, deixa vazia.
export const REFEICOES_PADRAO = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

export type RefeicaoRegistro = { nome: string; hora?: string; texto: string };

export type DiaRegistro = {
  data: string; // "2026-08-05"
  tipico: boolean; // dia comum ou fora da rotina (viagem, festa, doença)
  obs?: string;
  refeicoes: RefeicaoRegistro[];
};

export function addDiasIso(isoDay: string, n: number): string {
  // Meio-dia como âncora: nenhuma soma de dias cai na virada e muda de data.
  const d = new Date(`${isoDay}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

// Estrutura em branco para o paciente preencher.
export function diarioVazio(qtdDias: number, primeiroDiaIso: string): DiaRegistro[] {
  const dias = Math.min(Math.max(Math.round(qtdDias), 1), 7);
  return Array.from({ length: dias }, (_, i) => ({
    data: addDiasIso(primeiroDiaIso, i),
    tipico: true,
    obs: "",
    refeicoes: REFEICOES_PADRAO.map((nome) => ({ nome, texto: "" })),
  }));
}

// Leitura tolerante: o conteúdo é JSON gravado por um formulário público.
// Qualquer coisa estranha vira lista vazia em vez de derrubar a página do
// nutricionista.
export function parseDiario(content: string): DiaRegistro[] {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) return [];
    return data
      .filter((d) => d && typeof d === "object" && typeof d.data === "string")
      .map((d) => ({
        data: d.data as string,
        tipico: d.tipico !== false,
        obs: typeof d.obs === "string" ? d.obs : "",
        refeicoes: Array.isArray(d.refeicoes)
          ? d.refeicoes
              .filter((r: unknown) => r && typeof r === "object")
              .map((r: Record<string, unknown>) => ({
                nome: typeof r.nome === "string" ? r.nome : "Refeição",
                hora: typeof r.hora === "string" && r.hora ? r.hora : undefined,
                texto: typeof r.texto === "string" ? r.texto : "",
              }))
          : [],
      }));
  } catch {
    return [];
  }
}

export function serializeDiario(dias: DiaRegistro[]): string {
  return JSON.stringify(dias);
}

// Quanto já foi preenchido — usado para mostrar o andamento ao paciente e ao
// nutricionista. Um dia conta como preenchido quando tem ao menos uma
// refeição escrita.
export function progresso(dias: DiaRegistro[]): {
  diasPreenchidos: number;
  totalDias: number;
  refeicoesPreenchidas: number;
} {
  let refeicoesPreenchidas = 0;
  let diasPreenchidos = 0;

  for (const dia of dias) {
    const comTexto = dia.refeicoes.filter((r) => r.texto.trim().length > 0).length;
    refeicoesPreenchidas += comTexto;
    if (comTexto > 0) diasPreenchidos += 1;
  }

  return { diasPreenchidos, totalDias: dias.length, refeicoesPreenchidas };
}

// Só faz sentido enviar um recordatório com alguma coisa escrita.
export function podeEnviar(dias: DiaRegistro[]): boolean {
  return progresso(dias).refeicoesPreenchidas > 0;
}
