import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { setAppointmentStatus } from "@/app/actions";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const nutritionist = await getCurrentNutritionist();

  const appointments = await prisma.appointment.findMany({
    where: { nutritionistId: nutritionist.id },
    orderBy: { scheduledAt: "asc" },
    include: { patient: true },
  });

  const now = new Date();
  const upcoming = appointments.filter((a) => a.scheduledAt >= now || a.status === "agendada");
  const past = appointments.filter((a) => a.scheduledAt < now && a.status !== "agendada");

  const renderRows = (list: typeof appointments, showActions: boolean) =>
    list.map((a) => (
      <tr key={a.id}>
        <td>{formatDateTime(a.scheduledAt)}</td>
        <td>
          <Link href={`/pacientes/${a.patientId}`}>
            <strong>{a.patient.name}</strong>
          </Link>
        </td>
        <td>
          <span className={`badge ${a.status}`}>{a.status}</span>
        </td>
        <td>{a.notes ?? "—"}</td>
        <td>
          {showActions && a.status === "agendada" && (
            <div style={{ display: "flex", gap: 6 }}>
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
          )}
        </td>
      </tr>
    ));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Agenda</h1>
          <p>As consultas são agendadas pela página de cada paciente.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Próximas consultas</h2>
        {upcoming.length === 0 ? (
          <p className="empty">Nenhuma consulta pendente.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Paciente</th>
                <th>Status</th>
                <th>Observações</th>
                <th></th>
              </tr>
            </thead>
            <tbody>{renderRows(upcoming, true)}</tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>Histórico</h2>
        {past.length === 0 ? (
          <p className="empty">Nenhuma consulta no histórico.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Paciente</th>
                <th>Status</th>
                <th>Observações</th>
                <th></th>
              </tr>
            </thead>
            <tbody>{renderRows(past, false)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
