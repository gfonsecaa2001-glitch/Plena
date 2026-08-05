import { Icon } from "@/lib/icons";
import { parseRestricoes } from "@/lib/food-alert";
import { saveAnamnesis } from "@/app/actions";

type Paciente = {
  id: string;
  restrictions: string | null;
  conditions: string | null;
  medications: string | null;
  bowelHabit: string | null;
  sleepHours: number | null;
  waterLiters: number | null;
  familyHistory: string | null;
  anamnesis: string | null;
};

const HABITOS = ["", "normal", "constipado", "diarreico", "alternado"];

export function Anamnese({ patient }: { patient: Paciente }) {
  const restricoes = parseRestricoes(patient.restrictions);

  return (
    <div className="panel">
      <h2 className="section-title">
        <Icon name="clipboard" size={17} /> Anamnese
      </h2>

      {/* As restrições aparecem em destaque porque são o dado que o sistema
          usa para avisar quando um plano contraria a alergia do paciente. */}
      {restricoes.length > 0 && (
        <div className="restricoes-resumo no-print">
          <Icon name="alert" size={15} />
          <div>
            <strong>Restrições ativas:</strong>{" "}
            {restricoes.map((r) => (
              <span className="tag-restricao" key={r}>
                {r}
              </span>
            ))}
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Os planos deste paciente são conferidos contra esta lista.
            </div>
          </div>
        </div>
      )}

      <form className="stack" action={saveAnamnesis}>
        <input type="hidden" name="patientId" value={patient.id} />

        <div className="field">
          <label htmlFor="restrictions">Alergias, intolerâncias e restrições</label>
          <input
            id="restrictions"
            name="restrictions"
            defaultValue={patient.restrictions ?? ""}
            placeholder="lactose, glúten, frutos do mar, vegetariano…"
          />
          <span className="field-hint">
            Separe por vírgula. Cada item é cruzado com os alimentos do plano.
          </span>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="conditions">Condições de saúde</label>
            <input
              id="conditions"
              name="conditions"
              defaultValue={patient.conditions ?? ""}
              placeholder="diabetes tipo 2, hipertensão…"
            />
          </div>
          <div className="field">
            <label htmlFor="medications">Medicamentos e suplementos</label>
            <input
              id="medications"
              name="medications"
              defaultValue={patient.medications ?? ""}
              placeholder="metformina, vitamina D…"
            />
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label htmlFor="bowelHabit">Hábito intestinal</label>
            <select id="bowelHabit" name="bowelHabit" defaultValue={patient.bowelHabit ?? ""}>
              {HABITOS.map((h) => (
                <option key={h} value={h}>
                  {h === "" ? "não informado" : h}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sleepHours">Sono (h/noite)</label>
            <input
              id="sleepHours"
              name="sleepHours"
              inputMode="decimal"
              defaultValue={patient.sleepHours ?? ""}
              placeholder="7"
            />
          </div>
          <div className="field">
            <label htmlFor="waterLiters">Água (L/dia)</label>
            <input
              id="waterLiters"
              name="waterLiters"
              inputMode="decimal"
              defaultValue={patient.waterLiters ?? ""}
              placeholder="2"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="familyHistory">Histórico familiar</label>
          <input
            id="familyHistory"
            name="familyHistory"
            defaultValue={patient.familyHistory ?? ""}
            placeholder="mãe diabética, pai hipertenso…"
          />
        </div>

        <div className="field">
          <label htmlFor="anamnesis">Observações</label>
          <textarea
            id="anamnesis"
            name="anamnesis"
            rows={4}
            defaultValue={patient.anamnesis ?? ""}
            placeholder="Rotina, preferências, contexto — o que não coube nos campos acima."
          />
        </div>

        <div>
          <button className="btn small" type="submit">
            <Icon name="check" size={13} /> Salvar anamnese
          </button>
        </div>
      </form>
    </div>
  );
}
