import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

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
      ...(q ? { name: { contains: q } } : {}),
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
        <div>
          <h1>Pacientes</h1>
          <p>
            {patients.length} paciente{patients.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link className="btn" href="/pacientes/novo">
          + Novo paciente
        </Link>
      </div>

      <form className="searchbar" style={{ marginBottom: 16 }}>
        <input type="search" name="q" placeholder="Buscar por nome…" defaultValue={q ?? ""} />
      </form>

      <div className="panel">
        {patients.length === 0 ? (
          <p className="empty">Nenhum paciente encontrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Objetivo</th>
                <th>Último peso</th>
                <th>Próxima consulta</th>
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
                        <span className="avatar">
                          {p.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <strong>{p.name}</strong>
                      </Link>
                    </td>
                    <td>{p.goal ?? "—"}</td>
                    <td>{lastMeasurement?.weightKg ? `${lastMeasurement.weightKg} kg` : "—"}</td>
                    <td>
                      {nextAppointment
                        ? formatDateTime(nextAppointment.scheduledAt)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
