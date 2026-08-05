import { describe, it, expect } from "vitest";
import {
  detectDelimiter,
  parseDelimited,
  mapearColunas,
  parseDataPtBr,
  parseSexo,
  lerPlanilha,
  chavesDuplicidade,
  jaVisto,
} from "@/lib/csv";

describe("detectDelimiter", () => {
  it("reconhece o TAB de quem cola do Excel ou do Google Planilhas", () => {
    expect(detectDelimiter("nome\temail\ttelefone\nMaria\tm@x.com\t11999")).toBe("\t");
  });

  it("reconhece ponto e vírgula (Excel em português)", () => {
    expect(detectDelimiter("nome;email;telefone")).toBe(";");
  });

  it("reconhece vírgula", () => {
    expect(detectDelimiter("nome,email,telefone")).toBe(",");
  });
});

describe("parseDelimited", () => {
  it("lê uma planilha simples", () => {
    expect(parseDelimited("nome,idade\nMaria,30\nJoão,40")).toEqual([
      ["nome", "idade"],
      ["Maria", "30"],
      ["João", "40"],
    ]);
  });

  // "Silva, Maria" é exatamente como meio mundo escreve nome em planilha —
  // um split(",") ingênuo quebraria a linha inteira.
  it("respeita o delimitador dentro de aspas", () => {
    expect(parseDelimited('nome,objetivo\n"Silva, Maria",Emagrecimento')).toEqual([
      ["nome", "objetivo"],
      ["Silva, Maria", "Emagrecimento"],
    ]);
  });

  it("entende aspas escapadas", () => {
    expect(parseDelimited('obs\n"ela disse ""ok"" ontem"')).toEqual([
      ["obs"],
      ['ela disse "ok" ontem'],
    ]);
  });

  it("aceita quebra de linha dentro de aspas", () => {
    const r = parseDelimited('nome,obs\nMaria,"linha 1\nlinha 2"');
    expect(r).toHaveLength(2);
    expect(r[1][1]).toBe("linha 1\nlinha 2");
  });

  it("lida com CRLF do Windows", () => {
    expect(parseDelimited("nome,idade\r\nMaria,30\r\n")).toEqual([
      ["nome", "idade"],
      ["Maria", "30"],
    ]);
  });

  it("descarta linhas vazias do fim da planilha", () => {
    expect(parseDelimited("nome\nMaria\n\n\n")).toEqual([["nome"], ["Maria"]]);
  });
});

describe("mapearColunas", () => {
  it("reconhece os cabeçalhos que as pessoas realmente escrevem", () => {
    const m = mapearColunas(["Nome Completo", "E-mail", "Celular", "Data de Nascimento"]);
    expect(m.map((c) => c.campo)).toEqual(["name", "email", "phone", "birthDate"]);
  });

  it("ignora acento, caixa e pontuação no cabeçalho", () => {
    const m = mapearColunas(["  NOME  ", "Observações:", "Restrições"]);
    expect(m.map((c) => c.campo)).toEqual(["name", "anamnesis", "restrictions"]);
  });

  it("marca como nula a coluna que não reconhece", () => {
    const m = mapearColunas(["nome", "convênio", "plano de saúde"]);
    expect(m[0].campo).toBe("name");
    expect(m[1].campo).toBeNull();
    expect(m[2].campo).toBeNull();
  });

  // Duas colunas parecidas não podem virar o mesmo campo, senão a segunda
  // sobrescreveria a primeira silenciosamente.
  it("não mapeia duas colunas para o mesmo campo", () => {
    const m = mapearColunas(["telefone", "celular"]);
    expect(m[0].campo).toBe("phone");
    expect(m[1].campo).toBeNull();
  });
});

describe("parseDataPtBr", () => {
  it("lê o formato brasileiro", () => {
    const d = parseDataPtBr("25/03/1990")!;
    expect(d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })).toBe("25/03/1990");
  });

  it("lê o formato ISO", () => {
    const d = parseDataPtBr("1990-03-25")!;
    expect(d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })).toBe("25/03/1990");
  });

  it("aceita separadores diferentes e ano com 2 dígitos", () => {
    expect(parseDataPtBr("25-03-1990")).not.toBeNull();
    expect(parseDataPtBr("25.03.1990")).not.toBeNull();
    const d = parseDataPtBr("25/03/90")!;
    expect(d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })).toBe("25/03/1990");
  });

  // O JS "conserta" 31/02 para 03/03 sem avisar. Num prontuário, data errada
  // é pior que data ausente.
  it("recusa data que não existe", () => {
    expect(parseDataPtBr("31/02/1990")).toBeNull();
    expect(parseDataPtBr("32/01/1990")).toBeNull();
    expect(parseDataPtBr("25/13/1990")).toBeNull();
  });

  it("recusa nascimento no futuro ou absurdo", () => {
    expect(parseDataPtBr("25/03/2090")).toBeNull();
    expect(parseDataPtBr("25/03/1850")).toBeNull();
  });

  it("recusa lixo", () => {
    expect(parseDataPtBr("não sei")).toBeNull();
    expect(parseDataPtBr("")).toBeNull();
  });
});

describe("parseSexo", () => {
  it("entende as formas usuais", () => {
    expect(parseSexo("F")).toBe("F");
    expect(parseSexo("feminino")).toBe("F");
    expect(parseSexo("Masculino")).toBe("M");
    expect(parseSexo("m")).toBe("M");
  });

  it("qualquer outra coisa vira Outro, e vazio vira nulo", () => {
    expect(parseSexo("não-binário")).toBe("Outro");
    expect(parseSexo("")).toBeNull();
  });
});

describe("lerPlanilha", () => {
  const planilha = [
    "Nome,E-mail,Celular,Data de Nascimento,Sexo,Objetivo",
    "Maria Silva,maria@x.com,(11) 98765-4321,25/03/1990,F,Emagrecimento",
    '"Souza, João",joao@x.com,11912345678,1985-07-10,M,Hipertrofia',
  ].join("\n");

  it("lê os pacientes com os campos convertidos", () => {
    const r = lerPlanilha(planilha);
    expect(r.erros).toEqual([]);
    expect(r.pacientes).toHaveLength(2);
    expect(r.pacientes[0].name).toBe("Maria Silva");
    expect(r.pacientes[0].sex).toBe("F");
    expect(r.pacientes[0].phone).toBe("(11) 98765-4321");
    expect(r.pacientes[1].name).toBe("Souza, João");
  });

  it("informa o número da linha, para o nutricionista achar na planilha", () => {
    const r = lerPlanilha(planilha);
    expect(r.pacientes[0].linha).toBe(2); // linha 1 é o cabeçalho
    expect(r.pacientes[1].linha).toBe(3);
  });

  it("rejeita a linha sem nome, mas não o arquivo inteiro", () => {
    const r = lerPlanilha("Nome,E-mail\nMaria,maria@x.com\n,semnome@x.com\nAna,ana@x.com");
    expect(r.pacientes.map((p) => p.name)).toEqual(["Maria", "Ana"]);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0].linha).toBe(3);
  });

  // Perder a pessoa inteira por causa do aniversário seria uma troca ruim.
  it("importa mesmo com data ilegível, avisando", () => {
    const r = lerPlanilha("Nome,Nascimento\nMaria,não sei");
    expect(r.pacientes).toHaveLength(1);
    expect(r.pacientes[0].birthDate).toBeNull();
    expect(r.pacientes[0].avisos[0]).toContain("não reconhecida");
  });

  it("sem cabeçalho de nome, recusa o arquivo e explica", () => {
    const r = lerPlanilha("Maria,maria@x.com\nJoão,joao@x.com");
    expect(r.pacientes).toEqual([]);
    expect(r.erros[0].motivo).toContain("cabeçalho");
  });

  it("colar do Excel (TAB) funciona igual", () => {
    const r = lerPlanilha("Nome\tCelular\nMaria Silva\t11987654321");
    expect(r.pacientes).toHaveLength(1);
    expect(r.pacientes[0].phone).toBe("11987654321");
  });

  it("planilha vazia não quebra", () => {
    expect(lerPlanilha("")).toEqual({ colunas: [], pacientes: [], erros: [] });
  });

  // Planilha que virou histórico costuma ter uma linha por consulta. Prometer
  // 7 na prévia e gravar 5 faria o nutricionista achar que algo falhou.
  it("desconta a pessoa repetida dentro do próprio arquivo", () => {
    const r = lerPlanilha(
      [
        "Nome,Celular",
        "Carlos Lima,11944443333",
        "Carlos Lima,11944443333",
        "Ana Paula,11955554444",
      ].join("\n")
    );
    expect(r.pacientes.map((p) => p.name)).toEqual(["Carlos Lima", "Ana Paula"]);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0].motivo).toBe("repetido nesta planilha");
    expect(r.erros[0].linha).toBe(3);
  });

  it("homônimo com contato diferente não é considerado repetido", () => {
    const r = lerPlanilha(
      ["Nome,Celular", "Maria Silva,11911111111", "Maria Silva,11922222222"].join("\n")
    );
    expect(r.pacientes).toHaveLength(2);
  });
});

describe("chavesDuplicidade", () => {
  // Duas pessoas são a mesma se QUALQUER chave coincidir.
  const mesmaPessoa = (
    a: [string, string | null, string | null],
    b: [string, string | null, string | null]
  ) => chavesDuplicidade(...a).some((k) => chavesDuplicidade(...b).includes(k));

  it("ignora acento, caixa e espaço no nome", () => {
    expect(mesmaPessoa(["João Silva", "11987654321", null], ["  joao   silva ", "11987654321", null])).toBe(true);
  });

  it("ignora a formatação do telefone", () => {
    expect(mesmaPessoa(["Maria", "(11) 98765-4321", null], ["Maria", "11987654321", null])).toBe(true);
  });

  // O caso que passou batido em produção: a ficha antiga tinha só o telefone,
  // a planilha trouxe telefone E e-mail. Com uma chave única juntando os três
  // campos, as duas não casavam — e a mesma pessoa entrava duas vezes.
  it("reconhece a mesma pessoa quando um lado tem menos contatos", () => {
    expect(
      mesmaPessoa(["Maria Silva", "11987654321", null], ["Maria Silva", "(11) 98765-4321", "maria@x.com"])
    ).toBe(true);
  });

  it("reconhece pelo e-mail quando o telefone está só de um lado", () => {
    expect(mesmaPessoa(["Maria Silva", null, "maria@x.com"], ["Maria Silva", "11987654321", "maria@x.com"])).toBe(true);
  });

  it("homônimos com contatos diferentes são pessoas diferentes", () => {
    expect(mesmaPessoa(["Maria Silva", "11911111111", null], ["Maria Silva", "11922222222", null])).toBe(false);
  });

  it("nomes diferentes com o mesmo telefone são pessoas diferentes", () => {
    expect(mesmaPessoa(["Maria Silva", "11987654321", null], ["Maria Souza", "11987654321", null])).toBe(false);
  });

  it("sem contato nenhum, o nome é a identidade", () => {
    expect(mesmaPessoa(["Maria Silva", null, null], ["maria silva", null, null])).toBe(true);
  });
});

describe("jaVisto", () => {
  it("marca a segunda ocorrência, não a primeira", () => {
    const vistos = new Set<string>();
    expect(jaVisto(vistos, chavesDuplicidade("Maria", "11987654321", null))).toBe(false);
    expect(jaVisto(vistos, chavesDuplicidade("Maria", "11987654321", "m@x.com"))).toBe(true);
  });

  it("registra todas as chaves, para casar por qualquer contato depois", () => {
    const vistos = new Set<string>();
    jaVisto(vistos, chavesDuplicidade("Maria", "11987654321", "m@x.com"));
    // Chega depois só com o e-mail: ainda é a mesma pessoa.
    expect(jaVisto(vistos, chavesDuplicidade("Maria", null, "m@x.com"))).toBe(true);
  });
});
