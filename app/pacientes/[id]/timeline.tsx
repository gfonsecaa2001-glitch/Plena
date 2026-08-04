import Link from "next/link";
import { Icon, type IconName } from "@/lib/icons";
import { formatDateTime, formatDate, relativeDays } from "@/lib/datetime";
import { addNote, deleteNote } from "@/app/actions";

// Linha do tempo do acompanhamento.
//
// Junta numa ordem só o que hoje vive em blocos separados: consultas,
// evoluções escritas, avaliações, planos e anotações. É o que o nutricionista
// lê antes de atender — a história do paciente, não uma pilha de tabelas.

type Note = {
  id: string;
  appointmentId: string | null;
  kind: string;
  content: string;
  createdAt: Date;
};

type Appointment = {
  id: string;
  scheduledAt: Date;
  status: string;
  notes: string | null;
  source: string;
};

type Measurement = {
  id: string;
  date: Date;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
};

type MealPlan = { id: string; title: string; createdAt: Date };

type Event = {
  key: string;
  date: Date;
  kind: "consulta" | "avaliacao" | "plano" | "nota";
  icon: IconName;
  title: React.ReactNode;
  body?: React.ReactNode;
};

const STATUS_EMOJI: Record<string, string> = {
  agendada: "🗓️",
  realizada: "✅",
  faltou: "⚠️",
  cancelada: "🚫",
};

export function Timeline({
  patientId,
  appointments,
  measurements,
  mealPlans,
  notes,
}: {
  patientId: string;
  appointments: Appointment[];
  measurements: Measurement[];
  mealPlans: MealPlan[];
  notes: Note[];
}) {
  // Evoluções ficam agrupadas sob a consulta correspondente; as demais notas
  // entram como eventos próprios.
  const notesByAppointment = new Map<string, Note[]>();
  const loose: Note[] = [];
  for (const n of notes) {
    if (n.appointmentId) {
      const list = notesByAppointment.get(n.appointmentId) ?? [];
      list.push(n);
      notesByAppointment.set(n.appointmentId, list);
    } else {
      loose.push(n);
    }
  }

  const events: Event[] = [
    ...appointments.map((a): Event => {
      const evolucoes = notesByAppointment.get(a.id) ?? [];
      const passada = a.scheduledAt < new Date();
      return {
        key: `a-${a.id}`,
        date: a.scheduledAt,
        kind: "consulta",
        icon: "calendar",
        // Spans separados com gap: o espaço em texto some ao lado de emoji.
        title: (
          <span className="tl-title">
            Consulta
            <span className="tl-status">
              <span>{STATUS_EMOJI[a.status] ?? ""}</span>
              {a.status}
            </span>
          </span>
        ),
        body: (
          <>
            {a.notes && <p className="tl-note-text">{a.notes}</p>}
            {a.source === "publico" && (
              <span className="tag-source">
                <Icon name="link" size={11} /> agendada online
              </span>
            )}

            {evolucoes.map((n) => (
              <div className="tl-record" key={n.id}>
                <div className="tl-record-head">
                  <strong>Evolução</strong>
                  <span className="muted">{formatDate(n.createdAt)}</span>
                  <form action={deleteNote} className="no-print">
                    <input type="hidden" name="id" value={n.id} />
                    <button className="link-remove" type="submit" aria-label="Apagar evolução">
                      ×
                    </button>
                  </form>
                </div>
                <p>{n.content}</p>
              </div>
            ))}

            {/* Só faz sentido registrar evolução de consulta que já aconteceu */}
            {passada && evolucoes.length === 0 && (
              <details className="tl-form no-print">
                <summary>
                  <Icon name="clipboard" size={13} /> Registrar evolução
                </summary>
                <form action={addNote}>
                  <input type="hidden" name="patientId" value={patientId} />
                  <input type="hidden" name="appointmentId" value={a.id} />
                  <textarea
                    name="content"
                    rows={4}
                    required
                    placeholder="Relato do paciente, conduta e orientações desta consulta…"
                  />
                  <button className="btn small" type="submit">
                    Salvar evolução
                  </button>
                </form>
              </details>
            )}
          </>
        ),
      };
    }),

    ...measurements.map((m): Event => {
      const partes = [
        m.weightKg != null ? `${m.weightKg} kg` : null,
        m.bodyFatPct != null ? `${m.bodyFatPct}% gordura` : null,
        m.waistCm != null ? `cintura ${m.waistCm} cm` : null,
      ].filter(Boolean);
      return {
        key: `m-${m.id}`,
        date: m.date,
        kind: "avaliacao",
        icon: "ruler",
        title: "Avaliação registrada",
        body: partes.length ? <p className="tl-note-text">{partes.join(" · ")}</p> : undefined,
      };
    }),

    ...mealPlans.map((p): Event => ({
      key: `p-${p.id}`,
      date: p.createdAt,
      kind: "plano",
      icon: "meal",
      title: "Plano alimentar criado",
      body: (
        <p className="tl-note-text">
          <Link href={`/planos/${p.id}`}>{p.title}</Link>
        </p>
      ),
    })),

    ...loose.map((n): Event => ({
      key: `n-${n.id}`,
      date: n.createdAt,
      kind: "nota",
      icon: "clipboard",
      title: "Anotação",
      body: (
        <div className="tl-record">
          <div className="tl-record-head">
            <span className="muted">{formatDate(n.createdAt)}</span>
            <form action={deleteNote} className="no-print">
              <input type="hidden" name="id" value={n.id} />
              <button className="link-remove" type="submit" aria-label="Apagar anotação">
                ×
              </button>
            </form>
          </div>
          <p>{n.content}</p>
        </div>
      ),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="panel">
      <h2 className="section-title">
        <Icon name="activity" size={17} /> Histórico do acompanhamento
      </h2>

      <details className="tl-form standalone no-print">
        <summary>
          <Icon name="plus" size={13} /> Nova anotação
        </summary>
        <form action={addNote}>
          <input type="hidden" name="patientId" value={patientId} />
          <textarea
            name="content"
            rows={3}
            required
            placeholder="Ligou pedindo para remarcar · Relatou dificuldade com o jantar · …"
          />
          <button className="btn small" type="submit">
            Salvar anotação
          </button>
        </form>
      </details>

      {events.length === 0 ? (
        <p className="empty">
          Nada registrado ainda. As consultas, avaliações e planos aparecem aqui em ordem.
        </p>
      ) : (
        <ol className="timeline">
          {events.map((e) => (
            <li key={e.key} className={`tl-item ${e.kind}`}>
              <span className="tl-dot">
                <Icon name={e.icon} size={13} />
              </span>
              <div className="tl-content">
                <div className="tl-head">
                  <strong>{e.title}</strong>
                  <span className="tl-when" title={formatDateTime(e.date)}>
                    {formatDate(e.date)} · {relativeDays(e.date)}
                  </span>
                </div>
                {e.body}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
