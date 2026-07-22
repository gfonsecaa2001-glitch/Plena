import { getCurrentNutritionist } from "@/lib/tenant";
import { slugify } from "@/lib/booking";
import { saveBookingSettings } from "@/app/actions";
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

export default async function BookingSettingsPage() {
  const n = await getCurrentNutritionist();
  const active = new Set(n.bookingDays.split(","));
  const slug = n.bookingSlug ?? slugify(n.name);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Link de agendamento</h1>
          <p>Seus pacientes escolhem o horário sozinhos — sem troca de mensagens</p>
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

      <p className="privacy-note">
        🔒 A página pública mostra apenas os horários livres. Ninguém vê nomes de pacientes,
        nem quantas consultas você tem — um horário ocupado simplesmente não aparece.
      </p>
    </>
  );
}
