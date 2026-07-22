"use client";

// Seleção do horário + dados do paciente, em duas etapas.
// É componente de cliente porque precisa reagir ao clique (escolher o dia,
// escolher o horário, só então mostrar o formulário) sem recarregar a página.

import { useState } from "react";
import type { DaySlots } from "@/lib/booking";

export function SlotPicker({
  days,
  slug,
  action,
}: {
  days: DaySlots[];
  slug: string;
  action: (formData: FormData) => void;
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState<{ iso: string; label: string } | null>(null);

  const day = days[dayIndex];

  if (slot) {
    return (
      <form className="stack" action={action}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="slot" value={slot.iso} />

        <div className="slot-chosen">
          <div>
            <strong>{day.label}</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              às {slot.label}
            </div>
          </div>
          <button type="button" className="btn small secondary" onClick={() => setSlot(null)}>
            Trocar
          </button>
        </div>

        <div className="field">
          <label htmlFor="name">Seu nome *</label>
          <input id="name" name="name" required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefone / WhatsApp</label>
          <input id="phone" name="phone" />
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: "-4px 0 0" }}>
          Informe pelo menos um contato para confirmarmos.
        </p>
        <div className="field">
          <label htmlFor="note">Algo que o nutricionista deva saber?</label>
          <textarea id="note" name="note" rows={3} />
        </div>

        <button className="btn" type="submit">
          Confirmar agendamento
        </button>
      </form>
    );
  }

  return (
    <>
      <div className="day-tabs">
        {days.map((d, i) => (
          <button
            key={d.isoDay}
            type="button"
            className={`day-tab${i === dayIndex ? " active" : ""}`}
            onClick={() => setDayIndex(i)}
          >
            <span className="day-tab-week">{d.label.split(",")[0]}</span>
            <span className="day-tab-day">{d.isoDay.slice(8)}</span>
          </button>
        ))}
      </div>

      <h3 className="sub-head" style={{ marginTop: 18 }}>
        {day.label}
      </h3>
      <div className="slot-grid">
        {day.slots.map((s) => (
          <button key={s.iso} type="button" className="slot" onClick={() => setSlot(s)}>
            {s.label}
          </button>
        ))}
      </div>
    </>
  );
}
