import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { setAppointmentStatus } from "@/app/actions";
import {
  TZ,
  todayISO,
  dayRange,
  currentMonth,
  formatDate,
  formatDateTime,
  formatTime,
  relativeDays,
} from "@/lib/datetime";

export const dynamic = "force-dynamic";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function greeting() {
  const hour = Number(
    new Date().toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: TZ })
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function Dashboard() {
  const nutritionist = await getCurrentNutritionist();
  const now = new Date();
  const today = todayISO();
  const { start: dayStart, end: dayEnd } = dayRange(today);
  const { month: thisMonth, start: monthStart } = currentMonth();

  const [patients, todayAppointments, upcomingAppointments, recentMeasurements, recentPlans] =
    await Promise.all([
      prisma.patient.findMany({
        where: { nutritionistId: nutritionist.id },
        select: {
          id: true,
          name: true,
          birthDate: true,
          goal: true,
          createdAt: true,
          appointments: {
            where: { scheduledAt: { gte: now }, status: "agendada" },
            orderBy: { scheduledAt: "asc" },
            take: 1,
            select: { id: true },
          },
          measurements: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        },
      }),
      prisma.appointment.findMany({
        where: {
          nutritionistId: nutritionist.id,
          scheduledAt: { gte: dayStart, lt: dayEnd },
        },
        orderBy: { scheduledAt: "asc" },
        include: { patient: { select: { id: true, name: true, goal: true } } },
      }),
      prisma.appointment.findMany({
        where: {
          nutritionistId: nutritionist.id,
          scheduledAt: { gte: dayEnd },
          status: "agendada",
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: { patient: { select: { id: true, name: true } } },
      }),
      prisma.measurement.findMany({
        where: { patient: { nutritionistId: nutritionist.id } },
        orderBy: { date: "desc" },
        take: 5,
        include: { patient: { select: { id: true, name: true } } },
      }),
      prisma.mealPlan.findMany({
        where: { patient: { nutritionistId: nutritionist.id } },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { patient: { select: { id: true, name: true } } },
      }),
    ]);

  // --- Métricas derivadas (calculadas aqui, sem ir ao banco de novo) ---
  const newThisMonth = patients.filter((p) => p.createdAt >= monthStart).length;
  const withoutFollowUp = patients.filter((p) => p.appointments.length === 0);
  const birthdays = patients
    .filter((p) => p.birthDate && p.birthDate.getMonth() + 1 === thisMonth)
    .sort((a, b) => a.birthDate!.getDate() - b.birthDate!.getDate());
  const measurementsThisMonth = patients.filter(
    (p) => p.measurements[0] && p.measurements[0].date >= monthStart
  ).length;

  // Feed de atividade: junta avaliações e planos numa linha do tempo só
  const activity = [
    ...recentMeasurements.map((m) => ({
      id: `m-${m.id}`,
      date: m.date,
      patientId: m.patientId,
      patientName: m.patient.name,
      text: m.weightKg ? `avaliação registrada — ${m.weightKg} kg` : "avaliação registrada",
      kind: "measurement" as const,
    })),
    ...recentPlans.map((p) => ({
      id: `p-${p.id}`,
      date: p.createdAt,
      patientId: p.patientId,
      patientName: p.patient.name,
      text: `plano "${p.title}" criado`,
      kind: "plan" as const,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6);

  const isEmpty = patients.length === 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            {greeting()}, {nutritionist.name.split(" ")[0]} 👋
          </h1>
          <p style={{ textTransform: "capitalize" }}>
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: TZ,
            })}
          </p>
        </div>
        <Link className="btn" href="/pacientes/novo">
          + Novo paciente
        </Link>
      </div>

      {isEmpty ? (
        <div className="panel onboarding">
          <h2>Primeiros passos</h2>
          <p className="muted" style={{ marginTop: -8, fontSize: 14 }}>
            Seu consultório começa aqui. Leva menos de 5 minutos.
          </p>
          <ol className="steps">
            <li>
              <strong>Cadastre seu primeiro paciente</strong>
              <span>Nome já basta — o resto você completa na consulta.</span>
              <Link className="btn small" href="/pacientes/novo">
                Cadastrar paciente
              </Link>
            </li>
            <li>
              <strong>Registre a avaliação inicial</strong>
              <span>Peso e altura já geram o IMC e o primeiro ponto do gráfico.</span>
            </li>
            <li>
              <strong>Monte o plano alimentar</strong>
              <span>Refeições com horários, pronto para imprimir e entregar.</span>
            </li>
            <li>
              <strong>Agende o retorno</strong>
              <span>A consulta aparece aqui no dia, com um clique para marcar presença.</span>
            </li>
          </ol>
        </div>
      ) : (
        <div className="cards">
          <div className="card">
            <div className="card-icon">
              <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            </div>
            <div className="stat">{patients.length}</div>
            <div className="label">
              Pacientes
              {newThisMonth > 0 && <span className="delta">+{newThisMonth} este mês</span>}
            </div>
          </div>
          <div className="card">
            <div className="card-icon">
              <Icon d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            </div>
            <div className="stat">{todayAppointments.length}</div>
            <div className="label">Consultas hoje</div>
          </div>
          <div className="card">
            <div className="card-icon">
              <Icon d="M3 3v18h18M7 14l4-4 3 3 5-6" />
            </div>
            <div className="stat">{measurementsThisMonth}</div>
            <div className="label">Avaliados este mês</div>
          </div>
          <div className="card">
            <div className="card-icon">
              <Icon d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </div>
            <div className="stat">{withoutFollowUp.length}</div>
            <div className="label">Sem retorno marcado</div>
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="dash-grid">
          <div className="dash-col">
            <div className="panel">
              <h2>Agenda de hoje</h2>
              {todayAppointments.length === 0 ? (
                <>
                  <p className="empty">Nenhuma consulta hoje.</p>
                  {upcomingAppointments.length > 0 && (
                    <>
                      <h3 className="sub-head">Próximas</h3>
                      <ul className="list">
                        {upcomingAppointments.map((a) => (
                          <li key={a.id}>
                            <span className="avatar">{initials(a.patient.name)}</span>
                            <div className="list-main">
                              <Link href={`/pacientes/${a.patientId}`}>
                                <strong>{a.patient.name}</strong>
                              </Link>
                              <div className="muted">{a.notes ?? "Consulta"}</div>
                            </div>
                            <div className="list-meta">{formatDateTime(a.scheduledAt)}</div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <ul className="list">
                  {todayAppointments.map((a) => (
                    <li key={a.id}>
                      <span className="list-time">{formatTime(a.scheduledAt)}</span>
                      <span className="avatar">{initials(a.patient.name)}</span>
                      <div className="list-main">
                        <Link href={`/pacientes/${a.patientId}`}>
                          <strong>{a.patient.name}</strong>
                        </Link>
                        <div className="muted">{a.patient.goal ?? a.notes ?? "Consulta"}</div>
                      </div>
                      {a.status === "agendada" ? (
                        <div className="list-actions">
                          <form action={setAppointmentStatus}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="status" value="realizada" />
                            <button className="btn small" type="submit">
                              Realizada
                            </button>
                          </form>
                          <form action={setAppointmentStatus}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="status" value="faltou" />
                            <button className="btn small secondary" type="submit">
                              Faltou
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className={`badge ${a.status}`}>{a.status}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <h2>Atividade recente</h2>
              {activity.length === 0 ? (
                <p className="empty">Nada registrado ainda.</p>
              ) : (
                <ul className="activity">
                  {activity.map((item) => (
                    <li key={item.id}>
                      <span className={`dot ${item.kind}`} />
                      <div className="list-main">
                        <Link href={`/pacientes/${item.patientId}`}>
                          <strong>{item.patientName}</strong>
                        </Link>{" "}
                        <span className="muted">— {item.text}</span>
                      </div>
                      <div className="list-meta">{relativeDays(item.date)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="dash-col">
            <div className="panel">
              <h2>Precisam de atenção</h2>
              <p className="muted" style={{ marginTop: -10, fontSize: 12.5 }}>
                Pacientes sem próxima consulta marcada
              </p>
              {withoutFollowUp.length === 0 ? (
                <p className="empty">Todos com retorno agendado 🎉</p>
              ) : (
                <ul className="list compact">
                  {withoutFollowUp.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <span className="avatar">{initials(p.name)}</span>
                      <div className="list-main">
                        <Link href={`/pacientes/${p.id}`}>
                          <strong>{p.name}</strong>
                        </Link>
                        <div className="muted">
                          {p.measurements[0]
                            ? `última avaliação ${relativeDays(p.measurements[0].date)}`
                            : "sem avaliação"}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {withoutFollowUp.length > 6 && (
                <Link className="see-all" href="/pacientes">
                  ver todos os {withoutFollowUp.length} →
                </Link>
              )}
            </div>

            <div className="panel">
              <h2>Aniversariantes do mês</h2>
              {birthdays.length === 0 ? (
                <p className="empty">Ninguém faz aniversário este mês.</p>
              ) : (
                <ul className="list compact">
                  {birthdays.map((p) => (
                    <li key={p.id}>
                      <span className="avatar">{initials(p.name)}</span>
                      <div className="list-main">
                        <Link href={`/pacientes/${p.id}`}>
                          <strong>{p.name}</strong>
                        </Link>
                      </div>
                      <div className="list-meta">🎂 {formatDate(p.birthDate!).slice(0, 5)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
