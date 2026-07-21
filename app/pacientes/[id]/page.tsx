import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { addMeasurement, addAppointment, createMealPlan } from "@/app/actions";
import { parseMeals } from "@/lib/mealplan";
import { LineChart, type ChartSeries } from "./line-chart";

// Cores da paleta validada (script do guia de dataviz — CVD e contraste ok
// sobre o card #fdfdfa): série 1 verde-oliva, série 2 caramelo.
const SERIES_COLORS = ["#345c1f", "#c9803f"];

// Monta uma série do gráfico a partir das medições, pegando só as que têm o campo.
function buildSeries(
  measurements: ({ date: Date } & Record<string, unknown>)[],
  field: string,
  label: string,
  color: string
): ChartSeries {
  return {
    label,
    color,
    points: measurements
      .filter((m) => typeof m[field] === "number")
      .map((m) => ({ time: m.date.getTime(), value: m[field] as number }))
      .sort((a, b) => a.time - b.time),
  };
}

export const dynamic = "force-dynamic";

function age(birthDate: Date | null): string {
  if (!birthDate) return "—";
  const diff = Date.now() - birthDate.getTime();
  return `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} anos`;
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const nutritionist = await getCurrentNutritionist();

  // findFirst com nutritionistId: se o paciente for de OUTRO nutricionista,
  // é como se não existisse — isolamento entre contas.
  const patient = await prisma.patient.findFirst({
    where: { id, nutritionistId: nutritionist.id },
    include: {
      measurements: { orderBy: { date: "desc" } },
      appointments: { orderBy: { scheduledAt: "desc" } },
      mealPlans: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!patient) notFound();

  const latest = patient.measurements[0];
  const bmi =
    latest?.weightKg && latest?.heightCm
      ? (latest.weightKg / Math.pow(latest.heightCm / 100, 2)).toFixed(1)
      : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{patient.name}</h1>
          <p>
            {age(patient.birthDate)} · {patient.goal ?? "sem objetivo definido"} ·{" "}
            {patient.phone ?? patient.email ?? "sem contato"}
          </p>
        </div>
        <Link className="btn secondary" href="/pacientes">
          ← Voltar
        </Link>
      </div>

      <div className="cards">
        <div className="card">
          <div className="stat">{latest?.weightKg ? `${latest.weightKg} kg` : "—"}</div>
          <div className="label">Peso atual</div>
        </div>
        <div className="card">
          <div className="stat">{bmi ?? "—"}</div>
          <div className="label">IMC</div>
        </div>
        <div className="card">
          <div className="stat">{latest?.bodyFatPct ? `${latest.bodyFatPct}%` : "—"}</div>
          <div className="label">Gordura corporal</div>
        </div>
        <div className="card">
          <div className="stat">{patient.measurements.length}</div>
          <div className="label">Avaliações</div>
        </div>
      </div>

      {patient.anamnesis && (
        <div className="panel">
          <h2>Anamnese</h2>
          <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 14 }}>{patient.anamnesis}</p>
        </div>
      )}

      {(() => {
        const weight = buildSeries(patient.measurements, "weightKg", "Peso", SERIES_COLORS[0]);
        const fat = buildSeries(patient.measurements, "bodyFatPct", "Gordura", SERIES_COLORS[0]);
        const waist = buildSeries(patient.measurements, "waistCm", "Cintura", SERIES_COLORS[0]);
        const hip = buildSeries(patient.measurements, "hipCm", "Quadril", SERIES_COLORS[1]);
        const measures = [waist, hip].filter((s) => s.points.length >= 2);
        const hasCharts =
          weight.points.length >= 2 || fat.points.length >= 2 || measures.length > 0;

        return (
          <div className="panel">
            <h2>Evolução</h2>
            {!hasCharts ? (
              <p className="empty">
                Registre pelo menos duas avaliações para ver os gráficos de evolução.
              </p>
            ) : (
              <div className="charts-grid">
                {weight.points.length >= 2 && (
                  <LineChart title="Peso (kg)" unit="kg" series={[weight]} />
                )}
                {fat.points.length >= 2 && (
                  <LineChart title="Gordura corporal (%)" unit="%" series={[fat]} />
                )}
                {measures.length > 0 && (
                  <LineChart title="Medidas (cm)" unit="cm" series={measures} />
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="panel">
        <h2>Avaliações antropométricas</h2>
        <form className="inline-form" action={addMeasurement} style={{ marginBottom: 14 }}>
          <input type="hidden" name="patientId" value={patient.id} />
          <div className="field">
            <label>Data</label>
            <input name="date" type="date" />
          </div>
          <div className="field">
            <label>Peso (kg)</label>
            <input name="weightKg" inputMode="decimal" placeholder="72,5" />
          </div>
          <div className="field">
            <label>Altura (cm)</label>
            <input name="heightCm" inputMode="decimal" placeholder="170" />
          </div>
          <div className="field">
            <label>Gordura (%)</label>
            <input name="bodyFatPct" inputMode="decimal" />
          </div>
          <div className="field">
            <label>Cintura (cm)</label>
            <input name="waistCm" inputMode="decimal" />
          </div>
          <div className="field">
            <label>Quadril (cm)</label>
            <input name="hipCm" inputMode="decimal" />
          </div>
          <button className="btn small" type="submit">
            Registrar
          </button>
        </form>

        {patient.measurements.length === 0 ? (
          <p className="empty">Nenhuma avaliação registrada ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Peso</th>
                <th>Altura</th>
                <th>Gordura</th>
                <th>Cintura</th>
                <th>Quadril</th>
              </tr>
            </thead>
            <tbody>
              {patient.measurements.map((m) => (
                <tr key={m.id}>
                  <td>{m.date.toLocaleDateString("pt-BR")}</td>
                  <td>{m.weightKg ? `${m.weightKg} kg` : "—"}</td>
                  <td>{m.heightCm ? `${m.heightCm} cm` : "—"}</td>
                  <td>{m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}</td>
                  <td>{m.waistCm ? `${m.waistCm} cm` : "—"}</td>
                  <td>{m.hipCm ? `${m.hipCm} cm` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Planos alimentares</h2>
        <form className="inline-form" action={createMealPlan} style={{ marginBottom: 14 }}>
          <input type="hidden" name="patientId" value={patient.id} />
          <div className="field" style={{ flex: 1 }}>
            <label>Título do novo plano</label>
            <input name="title" placeholder="Ex.: Plano de emagrecimento — julho" />
          </div>
          <button className="btn small" type="submit">
            Criar plano
          </button>
        </form>

        {patient.mealPlans.length === 0 ? (
          <p className="empty">Nenhum plano alimentar ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plano</th>
                <th>Refeições</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {patient.mealPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <Link href={`/planos/${plan.id}`}>
                      <strong>{plan.title}</strong>
                    </Link>
                  </td>
                  <td>{parseMeals(plan.content).length}</td>
                  <td>{plan.createdAt.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Consultas</h2>
        <form className="inline-form" action={addAppointment} style={{ marginBottom: 14 }}>
          <input type="hidden" name="patientId" value={patient.id} />
          <div className="field">
            <label>Data e hora</label>
            <input name="scheduledAt" type="datetime-local" required />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Observações</label>
            <input name="notes" placeholder="Retorno, primeira consulta…" />
          </div>
          <button className="btn small" type="submit">
            Agendar
          </button>
        </form>

        {patient.appointments.length === 0 ? (
          <p className="empty">Nenhuma consulta agendada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Status</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {patient.appointments.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.scheduledAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td>
                    <span className={`badge ${a.status}`}>{a.status}</span>
                  </td>
                  <td>{a.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
