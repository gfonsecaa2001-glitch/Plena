import { describe, it, expect } from "vitest";
import { proximaAgendada, particionaAgenda } from "@/lib/agenda";

const agora = new Date("2026-08-05T12:00:00-03:00");
const em = (dias: number, status: string, id = "") => ({
  id: id || `${dias}:${status}`,
  scheduledAt: new Date(agora.getTime() + dias * 86400000),
  status,
});

describe("proximaAgendada", () => {
  it("pega a mais próxima entre as futuras", () => {
    const lista = [em(10, "agendada", "longe"), em(2, "agendada", "perto"), em(5, "agendada")];
    expect(proximaAgendada(lista, agora)?.id).toBe("perto");
  });

  // O defeito que existia: o lembrete de WhatsApp saía com a data de uma
  // consulta CANCELADA, mandando o paciente comparecer a algo desmarcado.
  it("ignora consulta cancelada", () => {
    const lista = [em(1, "cancelada", "desmarcada"), em(7, "agendada", "valida")];
    expect(proximaAgendada(lista, agora)?.id).toBe("valida");
  });

  it("ignora quem já faltou ou já foi realizada", () => {
    const lista = [em(1, "faltou"), em(2, "realizada"), em(9, "agendada", "valida")];
    expect(proximaAgendada(lista, agora)?.id).toBe("valida");
  });

  it("ignora consulta no passado", () => {
    expect(proximaAgendada([em(-3, "agendada")], agora)).toBeNull();
  });

  it("sem nada agendado à frente, devolve null", () => {
    expect(proximaAgendada([em(1, "cancelada"), em(-1, "realizada")], agora)).toBeNull();
    expect(proximaAgendada([], agora)).toBeNull();
  });
});

describe("particionaAgenda", () => {
  it("pendente é o que está agendado, inclusive do passado", () => {
    // Consulta de ontem que ninguém marcou ainda pede uma ação.
    const { pendentes } = particionaAgenda([em(-1, "agendada", "ontem"), em(3, "agendada", "amanha")]);
    expect(pendentes.map((p) => p.id)).toEqual(["ontem", "amanha"]);
  });

  // O defeito que existia: uma consulta futura cancelada entrava em
  // "próximas consultas" e era contada como pendente no cabeçalho.
  it("cancelada no futuro vai para o histórico, não para pendentes", () => {
    const { pendentes, historico } = particionaAgenda([em(5, "cancelada", "cancelada")]);
    expect(pendentes).toEqual([]);
    expect(historico.map((h) => h.id)).toEqual(["cancelada"]);
  });

  it("as duas listas cobrem tudo, sem repetir", () => {
    const lista = [em(-2, "realizada"), em(-1, "faltou"), em(1, "agendada"), em(2, "cancelada")];
    const { pendentes, historico } = particionaAgenda(lista);
    expect(pendentes.length + historico.length).toBe(lista.length);
    const ids = [...pendentes, ...historico].map((x) => x.id);
    expect(new Set(ids).size).toBe(lista.length);
  });

  it("pendentes em ordem crescente, histórico do mais recente para o mais antigo", () => {
    const { pendentes, historico } = particionaAgenda([
      em(9, "agendada", "p2"),
      em(1, "agendada", "p1"),
      em(-9, "realizada", "h2"),
      em(-1, "realizada", "h1"),
    ]);
    expect(pendentes.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(historico.map((h) => h.id)).toEqual(["h1", "h2"]);
  });
});
