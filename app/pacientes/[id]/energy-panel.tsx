import { Icon } from "@/lib/icons";
import { ACTIVITY_LEVELS, ageFrom, calcEnergy } from "@/lib/nutrition";
import { saveEnergyTargets } from "@/app/actions";

// Painel de gasto energético e metas.
//
// O sistema ESTIMA o gasto (TMB e GET) a partir dos dados do paciente.
// A META é sempre digitada pelo nutricionista — prescrição é decisão clínica,
// não pode ser preenchida sozinha pelo software.

type Patient = {
  id: string;
  sex: string | null;
  birthDate: Date | null;
  activityLevel: number | null;
  kcalTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
};

export function EnergyPanel({
  patient,
  weightKg,
  heightCm,
}: {
  patient: Patient;
  weightKg: number | null;
  heightCm: number | null;
}) {
  const ageYears = ageFrom(patient.birthDate);
  const energy = calcEnergy({
    sex: patient.sex,
    ageYears,
    weightKg,
    heightCm,
    activityLevel: patient.activityLevel,
  });

  // Lista exatamente o que falta, em vez de mostrar um número errado.
  const faltando: string[] = [];
  if (patient.sex !== "F" && patient.sex !== "M") faltando.push("sexo");
  if (!ageYears) faltando.push("data de nascimento");
  if (!weightKg) faltando.push("peso");
  if (!heightCm) faltando.push("altura");

  return (
    <div className="panel">
      <h2 className="section-title">
        <Icon name="activity" size={17} /> Gasto energético e metas
      </h2>

      {energy ? (
        <div className="energy-grid">
          <div className="energy-box">
            <span className="energy-label">TMB (Mifflin-St Jeor)</span>
            <strong>{energy.mifflin}</strong>
            <span className="energy-unit">kcal/dia em repouso</span>
          </div>
          <div className="energy-box">
            <span className="energy-label">TMB (Harris-Benedict)</span>
            <strong>{energy.harris}</strong>
            <span className="energy-unit">kcal/dia · comparação</span>
          </div>
          <div className="energy-box highlight">
            <span className="energy-label">GET estimado</span>
            <strong>{energy.get}</strong>
            <span className="energy-unit">
              kcal/dia · fator {energy.activityLevel.toFixed(3).replace(/0+$/, "")}
            </span>
          </div>
        </div>
      ) : (
        <p className="empty">
          Para estimar o gasto energético, preencha: <strong>{faltando.join(", ")}</strong>.
        </p>
      )}

      <form className="energy-form" action={saveEnergyTargets}>
        <input type="hidden" name="patientId" value={patient.id} />

        <div className="field">
          <label htmlFor="activityLevel">Nível de atividade física</label>
          <select
            id="activityLevel"
            name="activityLevel"
            defaultValue={String(patient.activityLevel ?? 1.55)}
          >
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label} — {a.hint}
              </option>
            ))}
          </select>
        </div>

        <div className="energy-targets">
          <div className="field">
            <label htmlFor="kcalTarget">Meta de calorias</label>
            <input
              id="kcalTarget"
              name="kcalTarget"
              inputMode="numeric"
              placeholder={energy ? String(energy.get) : "kcal"}
              defaultValue={patient.kcalTarget ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="proteinTarget">Proteína (g)</label>
            <input
              id="proteinTarget"
              name="proteinTarget"
              inputMode="decimal"
              defaultValue={patient.proteinTarget ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="carbTarget">Carboidrato (g)</label>
            <input
              id="carbTarget"
              name="carbTarget"
              inputMode="decimal"
              defaultValue={patient.carbTarget ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="fatTarget">Gordura (g)</label>
            <input
              id="fatTarget"
              name="fatTarget"
              inputMode="decimal"
              defaultValue={patient.fatTarget ?? ""}
            />
          </div>
          <button className="btn small" type="submit">
            Salvar metas
          </button>
        </div>
      </form>

      <p className="calc-note">
        Valores <strong>estimados</strong> por fórmulas populacionais (Mifflin-St Jeor e
        Harris-Benedict revisada). A prescrição final é sua — por isso a meta é digitada,
        não preenchida automaticamente.
      </p>
    </div>
  );
}
