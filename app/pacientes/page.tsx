import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { formatDateTime } from "@/lib/datetime";
import { Icon } from "@/lib/icons";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const nutritionist = await getCurrentNutritionist();

  const patients = await prisma.patient.findMany({
    where: {
      nutritionistId: nutritionist.id,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      measurements: { orderBy: { date: "desc" }, take: 1 },
      appointments: {
        where: { status: "agendada", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        take: 1,
      },
    },
  });

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">👥</span>
          <div>
            <h1>Pacientes</h1>
            <p>
              {patients.length} paciente{patients.length === 1 ? "" : "s"}
              {q ? ` encontrado${patients.length === 1 ? "" : "s"} para "${q}"` : ""}
            </p>
          </div>
        </div>
        <Link className="btn" href="/pacientes/novo">
          <Icon name="plus" size={15} /> Novo paciente
        </Link>
      </div>

      <form className="searchbar" style={{ marginBottom: 16 }}>
        <span className="searchbar-icon">
          <Icon name="search" size={16} />
        </span>
        <input type="search" name="q" placeholder="Buscar por nome…" defaultValue={q ?? ""} />
      </form>

      {patients.length === 0 ? (
        <div className="panel empty-state">
          <span className="empty-emoji">🔍</span>
          <h2>Nenhum paciente encontrado</h2>
          <p className="muted">
            {q ? (
              <>
                Nada para &quot;{q}&quot;. <Link href="/pacientes">Ver todos</Link>.
              </>
            ) : (
              <>
                Comece cadastrando o primeiro em{" "}
                <Link href="/pacientes/novo">Novo paciente</Link>.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>
                  <Icon name="patient" size={13} /> Nome
                </th>
                <th>
                  <Icon name="target" size={13} /> Objetivo
                </th>
                <th>
                  <Icon name="scale" size={13} /> Último peso
                </th>
                <th>
                  <Icon name="calendar" size={13} /> Próxima consulta
                </th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const lastMeasurement = p.measurements[0];
                const nextAppointment = p.appointments[0];
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/pacientes/${p.id}`} className="row-name">
                        <span className="avatar">{initials(p.name)}</span>
                        <strong>{p.name}</strong>
                      </Link>
                    </td>
                    <td>{p.goal ?? "—"}</td>
                    <td>{lastMeasurement?.weightKg ? `${lastMeasurement.weightKg} kg` : "—"}</td>
                    <td>
                      {nextAppointment ? (
                        formatDateTime(nextAppointment.scheduledAt)
                      ) : (
                        <span className="tag-warn">
                          <Icon name="alert" size={12} /> sem retorno
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
