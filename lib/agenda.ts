// Separação entre o que ainda é compromisso e o que já é histórico.
//
// O critério é o STATUS, não a data. Uma consulta cancelada continua no
// prontuário, mas não é compromisso — e uma consulta de ontem que ninguém
// marcou como realizada ainda pede uma ação do nutricionista.

export type Agendavel = { scheduledAt: Date; status: string };

// A próxima consulta é a mais próxima AINDA AGENDADA.
//
// Cancelada não conta: mandar "lembrando da sua consulta" para alguém que
// desmarcou é mandar a pessoa comparecer a algo que não existe mais.
export function proximaAgendada<T extends Agendavel>(lista: T[], agora: Date): T | null {
  const futuras = lista
    .filter((a) => a.status === "agendada" && a.scheduledAt.getTime() >= agora.getTime())
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  return futuras[0] ?? null;
}

// Divide a agenda em duas listas que cobrem tudo, sem sobreposição.
//
//   pendentes  → status "agendada" (inclusive as do passado, que precisam ser
//                marcadas como realizada ou falta)
//   historico  → todo o resto: realizada, faltou, cancelada
export function particionaAgenda<T extends Agendavel>(
  lista: T[]
): { pendentes: T[]; historico: T[] } {
  const pendentes = lista
    .filter((a) => a.status === "agendada")
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const historico = lista
    .filter((a) => a.status !== "agendada")
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

  return { pendentes, historico };
}
