import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { setAppointmentStatus } from "@/app/actions";
import { formatDateTime } from "@/lib/datetime";
import { Icon } from "@/lib/icons";
import { lembreteConsulta } from "@/lib/whatsapp";
import { WaButton } from "@/app/wa-button";
import { particionaAgenda } from "@/lib/agenda";

export const dynamic = "force-dynamic";

const STATUS_EMOJI: Record<string, string> = {
  agendada: "🗓️",
  realizada: "✅",
  faltou: "⚠️",
  cancelada: "🚫",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function AgendaPage() {
  const nutritionist = await getCurrentNutritionist();

  const appointments = await prisma.appointment.findMany({
    where: { nutritionistId: nutritionist.id },
    orderBy: { scheduledAt: "asc" },
    include: { patient: true },
  });

  // O que separa pendente de histórico é o STATUS, não a data: uma consulta
  // cancelada para semana que vem não é compromisso, e uma de ontem que
  // ninguém marcou ainda precisa de uma ação.
  const { pendentes: upcoming, historico: past } = particionaAgenda(appointments);

  const renderRows = (list: typeof appointments, showActions: boolean) =>
    list.map((a) => (
      <tr key={a.id}>
        <td>{formatDateTime(a.scheduledAt)}</td>
        <td>
          <Link href={`/pacientes/${a.patientId}`} className="row-name">
            <span className="avatar">{initials(a.patient.name)}</span>
            <strong>{a.patient.name}</strong>
          </Link>
        </td>
        <td>
          <span className={`badge ${a.status}`}>
            {STATUS_EMOJI[a.status]} {a.status}
          </span>
          {a.source === "publico" && (
            <span className="tag-source" title="Agendado pelo link público">
              <Icon name="link" size={11} /> online
            </span>
          )}
        </td>
        <td>{a.notes ?? "—"}</td>
        <td>
          {showActions && a.status === "agendada" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <WaButton
                phone={a.patient.phone}
                message={lembreteConsulta(a.patient.name, nutritionist.name, a.scheduledAt)}
                label="Lembrar"
                small
                title="Abre o WhatsApp com o lembrete desta consulta"
              />
              <form action={setAppointmentStatus}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value="realizada" />
                <button className="btn small" type="submit">
                  <Icon name="check" size={13} /> Realizada
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

  const header = (
    <tr>
      <th>
        <Icon name="clock" size={13} /> Data
      </th>
      <th>
        <Icon name="patient" size={13} /> Paciente
      </th>
      <th>Status</th>
      <th>Observações</th>
      <th></th>
    </tr>
  );

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">📅</span>
          <div>
            <h1>Agenda</h1>
            <p>
              {upcoming.length} consulta{upcoming.length === 1 ? "" : "s"} pendente
              {upcoming.length === 1 ? "" : "s"} · agende pela página do paciente ou pelo link
              público
            </p>
          </div>
        </div>
        <Link className="btn secondary" href="/agendamento">
          <Icon name="link" size={15} /> Link de agendamento
        </Link>
      </div>

      <div className="panel">
        <h2 className="section-title">
          <Icon name="calendarCheck" size={17} /> Próximas consultas
        </h2>
        {upcoming.length === 0 ? (
          <div className="empty-inline">
            <span className="empty-emoji small">🌤️</span>
            <p className="muted">Nenhuma consulta pendente.</p>
          </div>
        ) : (
          <table>
            <thead>{header}</thead>
            <tbody>{renderRows(upcoming, true)}</tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2 className="section-title">
          <Icon name="clipboard" size={17} /> Histórico
        </h2>
        {past.length === 0 ? (
          <p className="empty">Nenhuma consulta no histórico.</p>
        ) : (
          <table>
            <thead>{header}</thead>
            <tbody>{renderRows(past, false)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
