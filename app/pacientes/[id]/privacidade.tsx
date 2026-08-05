"use client";

// Painel de dados pessoais do paciente (LGPD).
//
// É componente de cliente só por causa do "Excluir": o formulário fica
// escondido até o nutricionista pedir. Um botão de exclusão definitiva sempre
// visível ao lado de "Registrar avaliação" é um acidente esperando acontecer.

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { deletePatient } from "@/app/actions";

export function Privacidade({
  patientId,
  patientName,
  erro,
}: {
  patientId: string;
  patientName: string;
  erro?: boolean;
}) {
  const [confirmando, setConfirmando] = useState(Boolean(erro));

  return (
    <div className="panel no-print">
      <h2 className="section-title">
        <Icon name="lock" size={17} /> Dados pessoais
      </h2>
      <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
        A LGPD dá ao paciente o direito de receber uma cópia dos próprios dados e o de
        pedir que sejam apagados. As duas ações estão aqui.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <a className="btn secondary small" href={`/api/pacientes/${patientId}/exportar`}>
          <Icon name="export" size={14} /> Baixar todos os dados (JSON)
        </a>
        {!confirmando && (
          <button
            className="btn small secondary danger"
            type="button"
            onClick={() => setConfirmando(true)}
          >
            <Icon name="trash" size={14} /> Excluir paciente
          </button>
        )}
      </div>

      {confirmando && (
        <div className="danger-zone">
          <p>
            <strong>Isto não tem volta.</strong> Somem as avaliações, as consultas, os
            planos alimentares, o histórico clínico e as cobranças de{" "}
            <strong>{patientName}</strong>.
          </p>
          {erro && (
            <p className="auth-error" style={{ margin: "8px 0" }}>
              O nome digitado não confere. Nada foi excluído.
            </p>
          )}
          <form action={deletePatient} className="inline-form">
            <input type="hidden" name="patientId" value={patientId} />
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label htmlFor="confirmacao">
                Digite <strong>{patientName}</strong> para confirmar
              </label>
              <input id="confirmacao" name="confirmacao" autoComplete="off" required />
            </div>
            <button className="btn small secondary danger" type="submit">
              Excluir definitivamente
            </button>
            <button
              className="btn small secondary"
              type="button"
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
