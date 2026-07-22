import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000);
}

function formatRelative(date: Date | null) {
  if (!date) return "nunca";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return date.toLocaleDateString("pt-BR");
}

export default async function AdminPage() {
  await requireAdmin();

  const [accounts, totalAccounts, newLast7, activeLast30, totalPatients, totalAppointments, totalMeasurements, totalPlans] =
    await Promise.all([
      // Só campos de negócio: nada de dados clínicos dos pacientes.
      prisma.nutritionist.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { patients: true, appointments: true } },
        },
      }),
      prisma.nutritionist.count(),
      prisma.nutritionist.count({ where: { createdAt: { gte: daysAgo(7) } } }),
      prisma.nutritionist.count({ where: { lastLoginAt: { gte: daysAgo(30) } } }),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.measurement.count(),
      prisma.mealPlan.count(),
    ]);

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
          <h1>Administração</h1>
          <p>Visão do negócio — uso da plataforma pelos nutricionistas</p>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-icon">
            {icon("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z")}
          </div>
          <div className="stat">{totalAccounts}</div>
          <div className="label">Contas cadastradas</div>
        </div>
        <div className="card">
          <div className="card-icon">{icon("M12 5v14M5 12h14")}</div>
          <div className="stat">{newLast7}</div>
          <div className="label">Novas (7 dias)</div>
        </div>
        <div className="card">
          <div className="card-icon">{icon("M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3")}</div>
          <div className="stat">{activeLast30}</div>
          <div className="label">Ativas (30 dias)</div>
        </div>
        <div className="card">
          <div className="card-icon">{icon("M3 3v18h18M7 14l4-4 3 3 5-6")}</div>
          <div className="stat">{totalPatients}</div>
          <div className="label">Pacientes na plataforma</div>
        </div>
      </div>

      <div className="panel">
        <h2>Contas</h2>
        <table>
          <thead>
            <tr>
              <th>Nutricionista</th>
              <th>Cadastro</th>
              <th>Último acesso</th>
              <th>Pacientes</th>
              <th>Consultas</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>
                  <div className="row-name">
                    <span className="avatar">
                      {a.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div>
                      <strong>{a.name}</strong>
                      {a.role === "admin" && <span className="tag-admin">admin</span>}
                      <div className="muted" style={{ fontSize: 12.5 }}>
                        {a.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{a.createdAt.toLocaleDateString("pt-BR")}</td>
                <td>{formatRelative(a.lastLoginAt)}</td>
                <td>{a._count.patients}</td>
                <td>{a._count.appointments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Uso agregado</h2>
        <div className="cards" style={{ marginBottom: 0 }}>
          <div className="card">
            <div className="stat">{totalAppointments}</div>
            <div className="label">Consultas agendadas</div>
          </div>
          <div className="card">
            <div className="stat">{totalMeasurements}</div>
            <div className="label">Avaliações registradas</div>
          </div>
          <div className="card">
            <div className="stat">{totalPlans}</div>
            <div className="label">Planos alimentares</div>
          </div>
        </div>
      </div>

      <p className="privacy-note">
        🔒 Este painel mostra apenas métricas de uso. Dados clínicos dos pacientes (nomes,
        anamnese, medidas, planos) não são acessíveis aqui — pertencem à relação entre o
        nutricionista e seus pacientes.
      </p>
    </>
  );
}
