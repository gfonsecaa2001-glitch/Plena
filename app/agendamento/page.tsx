import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { slugify } from "@/lib/booking";
import { formatDate } from "@/lib/datetime";
import { Icon } from "@/lib/icons";
import { saveBookingSettings, addAgendaBlock, deleteAgendaBlock } from "@/app/actions";
import { CopyLink } from "./copy-link";

export const dynamic = "force-dynamic";

const DAYS = [
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
  { value: "7", label: "Dom" },
];

// 720 → "12:00". Vazio quando não há intervalo configurado.
function horaDeMinutos(min: number | null): string {
  if (min == null) return "";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export default async function BookingSettingsPage() {
  const n = await getCurrentNutritionist();
  const active = new Set(n.bookingDays.split(","));
  const slug = n.bookingSlug ?? slugify(n.name);

  // Só o que ainda importa: bloqueio que já terminou é histórico inútil aqui.
  const blocks = await prisma.agendaBlock.findMany({
    where: { nutritionistId: n.id, end: { gte: new Date() } },
    orderBy: { start: "asc" },
  });

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">🔗</span>
          <div>
            <h1>Link de agendamento</h1>
            <p>Seus pacientes escolhem o horário sozinhos — sem troca de mensagens</p>
          </div>
        </div>
      </div>

      {n.bookingEnabled && n.bookingSlug && (
        <div className="panel">
          <h2>Seu link</h2>
          <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
            Mande no WhatsApp, coloque na bio do Instagram, no rodapé do e-mail.
          </p>
          <CopyLink path={`/agendar/${n.bookingSlug}`} />
        </div>
      )}

      <div className="panel">
        <h2>Configuração</h2>
        <form className="stack" action={saveBookingSettings} style={{ maxWidth: 560 }}>
          <label className="switch-row">
            <input type="checkbox" name="enabled" defaultChecked={n.bookingEnabled} />
            <span>
              <strong>Aceitar agendamentos online</strong>
              <small>Desligue quando estiver de férias — o link continua existindo.</small>
            </span>
          </label>

          <div className="field">
            <label htmlFor="slug">Endereço do link</label>
            <div className="slug-input">
              <span>/agendar/</span>
              <input id="slug" name="slug" defaultValue={slug} />
            </div>
          </div>

          <div className="field">
            <label>Dias de atendimento</label>
            <div className="day-checks">
              {DAYS.map((d) => (
                <label key={d.value} className="day-check">
                  <input type="checkbox" name={`day-${d.value}`} defaultChecked={active.has(d.value)} />
                  <span>{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="start">Começa às</label>
              <select id="start" name="start" defaultValue={String(n.bookingStart)}>
                {Array.from({ length: 18 }, (_, i) => i + 5).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="end">Termina às</label>
              <select id="end" name="end" defaultValue={String(n.bookingEnd)}>
                {Array.from({ length: 19 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="breakStart">Intervalo — começa às</label>
              <input
                id="breakStart"
                name="breakStart"
                type="time"
                defaultValue={horaDeMinutos(n.breakStartMin)}
              />
            </div>
            <div className="field">
              <label htmlFor="breakEnd">Intervalo — termina às</label>
              <input
                id="breakEnd"
                name="breakEnd"
                type="time"
                defaultValue={horaDeMinutos(n.breakEndMin)}
              />
            </div>
          </div>
          <span className="field-hint" style={{ marginTop: -6 }}>
            Almoço ou pausa fixa. Deixe vazio se não tiver. Nenhum encaixe que invada esse
            período é oferecido.
          </span>

          <div className="field">
            <label htmlFor="slotMin">Duração de cada consulta</label>
            <select id="slotMin" name="slotMin" defaultValue={String(n.bookingSlotMin)}>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
              <option value="90">1h30</option>
            </select>
          </div>

          <div>
            <button className="btn" type="submit">
              Salvar
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Períodos sem atendimento</h2>
        <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
          Férias, congresso, uma tarde de folga. Nesses dias o link não oferece horário
          nenhum. Você continua podendo marcar manualmente pela ficha do paciente — o
          bloqueio vale só para quem agenda sozinho.
        </p>

        <form className="inline-form" action={addAgendaBlock}>
          <div className="field">
            <label htmlFor="de">De</label>
            <input id="de" name="de" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="ate">Até</label>
            <input id="ate" name="ate" type="date" required />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 170 }}>
            <label htmlFor="reason">Motivo</label>
            <input id="reason" name="reason" placeholder="Férias, congresso… (opcional)" />
          </div>
          <button className="btn small" type="submit">
            <Icon name="plus" size={13} /> Bloquear
          </button>
        </form>

        {blocks.length === 0 ? (
          <p className="empty">Nenhum período bloqueado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Motivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id}>
                  <td>
                    {/* O fim é guardado como a meia-noite do dia seguinte;
                        mostramos o último dia realmente bloqueado. */}
                    {formatDate(b.start)} até{" "}
                    {formatDate(new Date(b.end.getTime() - 86400000))}
                  </td>
                  <td>{b.reason ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <form action={deleteAgendaBlock}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="btn small secondary danger" type="submit">
                        <Icon name="trash" size={13} /> Remover
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="privacy-note">
        🔒 A página pública mostra apenas os horários livres. Ninguém vê nomes de pacientes,
        nem quantas consultas você tem — um horário ocupado simplesmente não aparece.
      </p>
    </>
  );
}
