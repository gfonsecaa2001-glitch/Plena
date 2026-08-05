"use client";

// Formulário de dobras cutâneas.
//
// É componente de cliente por dois motivos concretos:
//   1. o protocolo escolhido muda QUAIS campos aparecem (e o Pollock de 3 pede
//      pontos diferentes para homens e mulheres);
//   2. o percentual aparece enquanto o nutricionista digita, então ele percebe
//      na hora se anotou 15 cm onde queria 15 mm.
//
// O valor mostrado aqui é só prévia — quem grava no prontuário é o servidor,
// que refaz a mesma conta com os mesmos dados.

import { useState } from "react";
import { Icon } from "@/lib/icons";
import {
  PROTOCOLOS,
  NOMES,
  bodyFatFromSkinfolds,
  classificar,
  idadeEm,
  type Protocolo,
  type DobraKey,
} from "@/lib/skinfold";

export function SkinfoldForm({
  patientId,
  sex,
  birthDate,
  action,
}: {
  patientId: string;
  sex: string | null;
  birthDate: string | null; // ISO, serializado pelo componente de servidor
  action: (formData: FormData) => void;
}) {
  const [protocolo, setProtocolo] = useState<Protocolo>("pollock7");
  const [valores, setValores] = useState<Record<string, string>>({});

  const config = PROTOCOLOS.find((p) => p.id === protocolo)!;
  const campos = config.dobras(sex);

  const idade = idadeEm(birthDate ? new Date(birthDate) : null, new Date());

  const dobras = Object.fromEntries(
    campos.map((c) => [c, Number(valores[c]?.replace(",", ".")) || null])
  );
  const previa = bodyFatFromSkinfolds(protocolo, dobras, sex, idade);

  // O Pollock precisa de idade e sexo; sem isso no cadastro, ele não se aplica.
  const faltaCadastro = protocolo !== "faulkner" && (!sex || idade === null);

  return (
    <form className="stack" action={action}>
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="protocolo" value={protocolo} />

      <div className="protocol-picker">
        {PROTOCOLOS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`protocol-chip${protocolo === p.id ? " active" : ""}`}
            onClick={() => setProtocolo(p.id)}
          >
            <strong>{p.label}</strong>
            <span>{p.descricao}</span>
          </button>
        ))}
      </div>

      {faltaCadastro && (
        <p className="calc-warning">
          <Icon name="alert" size={14} /> Este protocolo usa idade e sexo na fórmula.
          Preencha os dois no cadastro do paciente, ou use o Faulkner.
        </p>
      )}

      <div className="skinfold-grid">
        {campos.map((campo: DobraKey) => (
          <div className="field" key={campo}>
            <label htmlFor={campo}>{NOMES[campo]} (mm)</label>
            <input
              id={campo}
              name={campo}
              inputMode="decimal"
              value={valores[campo] ?? ""}
              onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
              required
            />
          </div>
        ))}
      </div>

      <div className="inline-form" style={{ alignItems: "flex-end" }}>
        <div className="field">
          <label htmlFor="skinfold-date">Data</label>
          <input id="skinfold-date" name="date" type="date" />
        </div>
        <div className="field">
          <label htmlFor="skinfold-weight">Peso (kg)</label>
          <input id="skinfold-weight" name="weightKg" inputMode="decimal" placeholder="opcional" />
        </div>

        <div className="skinfold-result">
          {previa === null ? (
            <span className="muted">preencha as dobras para ver o resultado</span>
          ) : (
            <>
              <strong>{previa.toFixed(1).replace(".", ",")}%</strong>
              <span>de gordura · {classificar(previa, sex)}</span>
            </>
          )}
        </div>

        <button className="btn small" type="submit" disabled={previa === null}>
          <Icon name="check" size={13} /> Registrar
        </button>
      </div>
    </form>
  );
}
