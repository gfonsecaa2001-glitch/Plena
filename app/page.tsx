import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const nutritionist = await getCurrentNutritionist();

  const [patientCount, upcoming, measurementCount, recentPatients] = await Promise.all([
    prisma.patient.count({ where: { nutritionistId: nutritionist.id } }),
    prisma.appointment.count({
      where: {
        nutritionistId: nutritionist.id,
        status: "agendada",
        scheduledAt: { gte: new Date() },
      },
    }),
    prisma.measurement.count({
      where: { patient: { nutritionistId: nutritionist.id } },
    }),
    prisma.patient.findMany({
      where: { nutritionistId: nutritionist.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const icon = (d: string) => (
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Olá, {nutritionist.name.split(" ")[0]} 👋</h1>
          <p style={{ textTransform: "capitalize" }}>{today}</p>
        </div>
        <Link className="btn" href="/pacientes/novo">
          + Novo paciente
        </Link>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-icon">
            {icon(
              "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
            )}
          </div>
          <div className="stat">{patientCount}</div>
          <div className="label">Pacientes ativos</div>
        </div>
        <div className="card">
          <div className="card-icon">
            {icon(
              "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM9 15l2 2 4-4"
            )}
          </div>
          <div className="stat">{upcoming}</div>
          <div className="label">Consultas agendadas</div>
        </div>
        <div className="card">
          <div className="card-icon">
            {icon("M3 3v18h18M7 14l4-4 3 3 5-6")}
          </div>
          <div className="stat">{measurementCount}</div>
          <div className="label">Avaliações registradas</div>
        </div>
      </div>

      <div className="panel">
        <h2>Pacientes recentes</h2>
        {recentPatients.length === 0 ? (
          <p className="empty">
            Nenhum paciente ainda. <Link href="/pacientes/novo">Cadastre o primeiro</Link>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Objetivo</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {recentPatients.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pacientes/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.goal ?? "—"}</td>
                  <td>{p.createdAt.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
