import { describe, it, expect } from "vitest";
import {
  diarioVazio,
  parseDiario,
  serializeDiario,
  progresso,
  podeEnviar,
  addDiasIso,
  REFEICOES_PADRAO,
  type DiaRegistro,
} from "@/lib/diary";

describe("addDiasIso", () => {
  it("soma dias sem escorregar de data", () => {
    expect(addDiasIso("2026-08-05", 1)).toBe("2026-08-06");
    expect(addDiasIso("2026-08-05", 0)).toBe("2026-08-05");
  });

  it("atravessa a virada do mês e do ano", () => {
    expect(addDiasIso("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDiasIso("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("acerta o 29 de fevereiro em ano bissexto", () => {
    expect(addDiasIso("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDiasIso("2027-02-28", 1)).toBe("2027-03-01");
  });
});

describe("diarioVazio", () => {
  it("cria um bloco por dia, em sequência", () => {
    const d = diarioVazio(3, "2026-08-05");
    expect(d.map((x) => x.data)).toEqual(["2026-08-05", "2026-08-06", "2026-08-07"]);
  });

  it("cada dia vem com as refeições padrão em branco", () => {
    const [dia] = diarioVazio(1, "2026-08-05");
    expect(dia.refeicoes.map((r) => r.nome)).toEqual(REFEICOES_PADRAO);
    expect(dia.refeicoes.every((r) => r.texto === "")).toBe(true);
    expect(dia.tipico).toBe(true);
  });

  // Pedir 60 dias de recordatório não é recordatório, é castigo — e geraria
  // um formulário impossível de enviar pelo celular.
  it("limita a faixa de dias", () => {
    expect(diarioVazio(0, "2026-08-05")).toHaveLength(1);
    expect(diarioVazio(99, "2026-08-05")).toHaveLength(7);
  });
});

describe("parseDiario", () => {
  it("faz a volta completa com serializeDiario", () => {
    const original = diarioVazio(2, "2026-08-05");
    original[0].refeicoes[0].texto = "2 pães com manteiga e café com leite";
    original[0].refeicoes[0].hora = "07:30";
    expect(parseDiario(serializeDiario(original))).toEqual(original);
  });

  // O conteúdo vem de um formulário PÚBLICO. Nada aqui pode derrubar a ficha
  // do paciente na tela do nutricionista.
  it("aguenta lixo sem quebrar", () => {
    expect(parseDiario("")).toEqual([]);
    expect(parseDiario("não é json")).toEqual([]);
    expect(parseDiario('{"nao":"array"}')).toEqual([]);
    expect(parseDiario("[null, 42, {}]")).toEqual([]);
  });

  it("descarta dia sem data e conserta refeição malformada", () => {
    const bruto = JSON.stringify([
      { semData: true },
      { data: "2026-08-05", refeicoes: [{ texto: "arroz" }, "lixo", { nome: "Almoço" }] },
    ]);
    const r = parseDiario(bruto);
    expect(r).toHaveLength(1);
    expect(r[0].refeicoes).toEqual([
      { nome: "Refeição", hora: undefined, texto: "arroz" },
      { nome: "Almoço", hora: undefined, texto: "" },
    ]);
  });

  it("dia sem 'tipico' é considerado típico", () => {
    const r = parseDiario(JSON.stringify([{ data: "2026-08-05", refeicoes: [] }]));
    expect(r[0].tipico).toBe(true);
  });

  it("respeita 'tipico' falso", () => {
    const r = parseDiario(JSON.stringify([{ data: "2026-08-05", tipico: false, refeicoes: [] }]));
    expect(r[0].tipico).toBe(false);
  });
});

describe("progresso", () => {
  const comDados = (): DiaRegistro[] => {
    const d = diarioVazio(3, "2026-08-05");
    d[0].refeicoes[0].texto = "café";
    d[0].refeicoes[2].texto = "arroz, feijão e frango";
    d[1].refeicoes[2].texto = "macarrão";
    return d;
  };

  it("conta dias e refeições preenchidas", () => {
    expect(progresso(comDados())).toEqual({
      diasPreenchidos: 2,
      totalDias: 3,
      refeicoesPreenchidas: 3,
    });
  });

  it("espaço em branco não conta como preenchido", () => {
    const d = diarioVazio(1, "2026-08-05");
    d[0].refeicoes[0].texto = "   ";
    expect(progresso(d).refeicoesPreenchidas).toBe(0);
    expect(progresso(d).diasPreenchidos).toBe(0);
  });

  it("diário vazio não tem nada preenchido", () => {
    expect(progresso(diarioVazio(3, "2026-08-05"))).toEqual({
      diasPreenchidos: 0,
      totalDias: 3,
      refeicoesPreenchidas: 0,
    });
  });
});

describe("podeEnviar", () => {
  it("exige ao menos uma refeição escrita", () => {
    expect(podeEnviar(diarioVazio(3, "2026-08-05"))).toBe(false);
    const d = diarioVazio(3, "2026-08-05");
    d[2].refeicoes[4].texto = "sopa";
    expect(podeEnviar(d)).toBe(true);
  });
});
