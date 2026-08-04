import { setPatientStatus } from "@/app/actions";

// Situação do paciente no acompanhamento.
//
// Três botões em vez de um menu: são poucas opções e a atual precisa ficar
// visível de relance na ficha, não escondida dentro de um seletor.

const OPCOES = [
  { value: "ativo", label: "Ativo", hint: "em acompanhamento" },
  { value: "inativo", label: "Inativo", hint: "parou de vir" },
  { value: "alta", label: "Alta", hint: "objetivo concluído" },
];

export function StatusControl({ patientId, status }: { patientId: string; status: string }) {
  return (
    <div className="status-control no-print">
      {OPCOES.map((o) => {
        const atual = o.value === status;
        return (
          <form action={setPatientStatus} key={o.value}>
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="status" value={o.value} />
            <button
              type="submit"
              className={`status-btn ${o.value}${atual ? " active" : ""}`}
              title={o.hint}
              aria-pressed={atual}
            >
              {o.label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
