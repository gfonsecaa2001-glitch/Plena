import { Icon } from "@/lib/icons";
import { savePlanAsTemplate, copyPlanToPatient } from "@/app/actions";

// Reaproveitamento do plano: virar modelo (para qualquer paciente futuro) ou
// ser copiado direto para outro paciente (quando são só dois com a mesma
// conduta e não vale criar um modelo).
export function ReusePanel({
  planId,
  planTitle,
  outrosPacientes,
}: {
  planId: string;
  planTitle: string;
  outrosPacientes: { id: string; name: string }[];
}) {
  return (
    <div className="panel no-print">
      <h2 className="section-title">
        <Icon name="copy" size={17} /> Reaproveitar este plano
      </h2>
      <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
        As duas opções fazem uma <strong>cópia</strong>: editar o resultado depois não
        mexe neste plano, nem o contrário.
      </p>

      <form className="inline-form" action={savePlanAsTemplate}>
        <input type="hidden" name="planId" value={planId} />
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="template-title">Salvar como modelo</label>
          <input
            id="template-title"
            name="title"
            defaultValue={planTitle}
            placeholder="Nome do modelo"
          />
        </div>
        <button className="btn small secondary" type="submit">
          <Icon name="clipboard" size={13} /> Salvar modelo
        </button>
      </form>

      {outrosPacientes.length > 0 && (
        <form className="inline-form" action={copyPlanToPatient} style={{ marginTop: 10 }}>
          <input type="hidden" name="planId" value={planId} />
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="destino">Copiar para outro paciente</label>
            <select id="destino" name="destinoId" required>
              {outrosPacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn small secondary" type="submit">
            <Icon name="copy" size={13} /> Copiar
          </button>
        </form>
      )}
    </div>
  );
}
