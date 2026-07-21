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

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Olá, {nutritionist.name.split(" ")[0]} 👋</h1>
          <p>Visão geral do seu consultório</p>
        </div>
        <Link className="btn" href="/pacientes/novo">
          + Novo paciente
        </Link>
      </div>

      <div className="cards">
        <div className="card">
          <div className="stat">{patientCount}</div>
          <div className="label">Pacientes</div>
        </div>
        <div className="card">
          <div className="stat">{upcoming}</div>
          <div className="label">Consultas agendadas</div>
        </div>
        <div className="card">
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
