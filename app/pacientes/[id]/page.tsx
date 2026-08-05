import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { addMeasurement, addAppointment, createMealPlan, addSkinfold } from "@/app/actions";
import { PROTOCOLOS } from "@/lib/skinfold";
import { parseMeals } from "@/lib/mealplan";
import { formatDate, formatDateTime, daysSince } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import { mealIcon } from "@/lib/food-icons";
import { Icon } from "@/lib/icons";
import { lembreteConsulta, retomarContato, saudacao } from "@/lib/whatsapp";
import { WaButton } from "@/app/wa-button";
import { LineChart, type ChartSeries } from "./line-chart";
import { EnergyPanel } from "./energy-panel";
import { Timeline } from "./timeline";
import { StatusControl } from "./status-control";
import { Privacidade } from "./privacidade";
import { SkinfoldForm } from "./skinfold-form";

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

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;

  const nutritionist = await getCurrentNutritionist();

  // findFirst com nutritionistId: se o paciente for de OUTRO nutricionista,
  // é como se não existisse — isolamento entre contas.
  const patient = await prisma.patient.findFirst({
    where: { id, nutritionistId: nutritionist.id },
    include: {
      measurements: { orderBy: { date: "desc" } },
      appointments: { orderBy: { scheduledAt: "desc" } },
      mealPlans: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      charges: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  if (!patient) notFound();

  const proximas = patient.appointments.filter((a) => a.scheduledAt >= new Date());

  // A mensagem do botão de WhatsApp muda conforme a situação do paciente —
  // lembrar de uma consulta marcada e chamar de volta quem sumiu são conversas
  // diferentes, e escolher errado obrigaria a apagar tudo e reescrever.
  const proximaConsulta = proximas[proximas.length - 1]; // a mais próxima (lista vem decrescente)
  const ultimaRealizada = patient.appointments.find((a) => a.status === "realizada");
  const diasSemVir = ultimaRealizada ? daysSince(ultimaRealizada.scheduledAt) : null;

  const mensagemWhats = proximaConsulta
    ? lembreteConsulta(patient.name, nutritionist.name, proximaConsulta.scheduledAt)
    : diasSemVir != null && diasSemVir >= 45
      ? retomarContato(patient.name, nutritionist.name, diasSemVir)
      : saudacao(patient.name, nutritionist.name);

  const latest = patient.measurements[0];
  const bmi =
    latest?.weightKg && latest?.heightCm
      ? (latest.weightKg / Math.pow(latest.heightCm / 100, 2)).toFixed(1)
      : null;

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="avatar big">
            {patient.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <h1>{patient.name}</h1>
            <p>
              {age(patient.birthDate)} · {patient.goal ?? "sem objetivo definido"} ·{" "}
              {patient.phone ?? patient.email ?? "sem contato"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StatusControl patientId={patient.id} status={patient.status} />
          <WaButton phone={patient.phone} message={mensagemWhats} />
          <Link className="btn secondary" href="/pacientes">
            <Icon name="back" size={15} /> Voltar
          </Link>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-icon">
            <Icon name="scale" size={17} />
          </div>
          <div className="stat">{latest?.weightKg ? `${latest.weightKg} kg` : "—"}</div>
          <div className="label">Peso atual</div>
        </div>
        <div className="card">
          <div className="card-icon">
            <Icon name="target" size={17} />
          </div>
          <div className="stat">{bmi ?? "—"}</div>
          <div className="label">IMC</div>
        </div>
        <div className="card">
          <div className="card-icon">
            <Icon name="activity" size={17} />
          </div>
          <div className="stat">{latest?.bodyFatPct ? `${latest.bodyFatPct}%` : "—"}</div>
          <div className="label">Gordura corporal</div>
        </div>
        <div className="card">
          <div className="card-icon">
            <Icon name="clipboard" size={17} />
          </div>
          <div className="stat">{patient.measurements.length}</div>
          <div className="label">Avaliações</div>
        </div>
      </div>

      <EnergyPanel
        patient={patient}
        weightKg={latest?.weightKg ?? null}
        heightCm={latest?.heightCm ?? null}
      />

      {patient.anamnesis && (
        <div className="panel">
          <h2 className="section-title">
            <Icon name="clipboard" size={17} /> Anamnese
          </h2>
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
            <h2 className="section-title">
              <Icon name="trend" size={17} /> Evolução
            </h2>
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
        <h2 className="section-title">
          <Icon name="ruler" size={17} /> Avaliações antropométricas
        </h2>
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
                  <td>{formatDate(m.date)}</td>
                  <td>{m.weightKg ? `${m.weightKg} kg` : "—"}</td>
                  <td>{m.heightCm ? `${m.heightCm} cm` : "—"}</td>
                  <td>
                    {m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}
                    {/* O protocolo importa: comparar um Pollock com um Faulkner
                        é comparar dois métodos diferentes, não uma evolução. */}
                    {m.skinfoldProtocol && (
                      <div className="muted" style={{ fontSize: 11.5 }}>
                        {PROTOCOLOS.find((p) => p.id === m.skinfoldProtocol)?.label ??
                          m.skinfoldProtocol}
                      </div>
                    )}
                  </td>
                  <td>{m.waistCm ? `${m.waistCm} cm` : "—"}</td>
                  <td>{m.hipCm ? `${m.hipCm} cm` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel no-print">
        <h2 className="section-title">
          <Icon name="ruler" size={17} /> Dobras cutâneas
        </h2>
        <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
          Meça com o adipômetro e o percentual de gordura sai calculado. Registrar aqui
          preenche a mesma avaliação do dia — não cria uma linha nova no histórico.
        </p>
        <SkinfoldForm
          patientId={patient.id}
          sex={patient.sex}
          birthDate={patient.birthDate ? patient.birthDate.toISOString() : null}
          action={addSkinfold}
        />
      </div>

      <div className="panel">
        <h2 className="section-title">
          <span className="section-emoji">🥗</span> Planos alimentares
        </h2>
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
              {patient.mealPlans.map((plan) => {
                const planMeals = parseMeals(plan.content);
                return (
                  <tr key={plan.id}>
                    <td>
                      <Link href={`/planos/${plan.id}`}>
                        <strong>{plan.title}</strong>
                      </Link>
                      <div className="plan-meals inline">
                        {planMeals.slice(0, 5).map((m, i) => (
                          <span key={i} title={m.name}>
                            {mealIcon(m.name)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{planMeals.length}</td>
                    <td>{formatDate(plan.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2 className="section-title">
          <Icon name="calendar" size={17} /> Consultas
        </h2>
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

        {/* Aqui ficam só as consultas ainda por vir. O histórico completo
            aparece na linha do tempo, junto com o resto do acompanhamento. */}
        {proximas.length === 0 ? (
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
              {proximas.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.scheduledAt)}</td>
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

      {patient.charges.length > 0 && (
        <div className="panel">
          <h2 className="section-title">
            <Icon name="wallet" size={17} /> Financeiro
          </h2>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {patient.charges.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.description}
                    {c.dueDate && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        vence em {formatDate(c.dueDate)}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong>{formatCents(c.amountCents)}</strong>
                  </td>
                  <td>
                    <span className={`badge-cobranca ${c.status}`}>
                      {c.status === "pago"
                        ? "recebido"
                        : c.status === "pendente"
                          ? "em aberto"
                          : "cancelado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link className="see-all" href="/financeiro">
            gerenciar no Financeiro →
          </Link>
        </div>
      )}

      <Timeline
        patientId={patient.id}
        appointments={patient.appointments}
        measurements={patient.measurements}
        mealPlans={patient.mealPlans}
        notes={patient.notes}
      />

      <Privacidade
        patientId={patient.id}
        patientName={patient.name}
        erro={erro === "confirmacao"}
      />
    </>
  );
}
