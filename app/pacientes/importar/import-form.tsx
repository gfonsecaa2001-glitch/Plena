"use client";

// Importação de pacientes, em duas etapas: colar/enviar a planilha, conferir a
// prévia, e só então gravar.
//
// A prévia usa a MESMA função do servidor (lib/csv.ts). Se a leitura fosse
// diferente dos dois lados, o nutricionista aprovaria uma coisa e o sistema
// salvaria outra — que é o pior defeito possível numa importação.

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { lerPlanilha, type LeituraPlanilha } from "@/lib/csv";
import { importPatients } from "@/app/actions";

const EXEMPLO = `Nome,E-mail,Celular,Data de Nascimento,Sexo,Objetivo
Maria Silva,maria@exemplo.com,(11) 98765-4321,25/03/1990,F,Emagrecimento
João Souza,joao@exemplo.com,11912345678,10/07/1985,M,Hipertrofia`;

const ROTULOS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  birthDate: "Nascimento",
  sex: "Sexo",
  goal: "Objetivo",
  restrictions: "Restrições",
  anamnesis: "Observações",
};

export function ImportForm() {
  const [texto, setTexto] = useState("");
  const leitura: LeituraPlanilha | null = texto.trim() ? lerPlanilha(texto) : null;

  async function aoEnviarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTexto(await file.text());
  }

  const reconhecidas = leitura?.colunas.filter((c) => c.campo) ?? [];
  const ignoradas = leitura?.colunas.filter((c) => !c.campo) ?? [];
  const podeImportar = (leitura?.pacientes.length ?? 0) > 0;

  return (
    <>
      <div className="panel">
        <h2 className="section-title">
          <Icon name="export" size={17} /> 1. Traga sua planilha
        </h2>
        <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
          Selecione tudo no Excel ou no Google Planilhas (<strong>com a linha de
          cabeçalho</strong>) e cole aqui. Ou envie um arquivo .csv.
        </p>

        <div className="field">
          <label htmlFor="arquivo">Arquivo CSV</label>
          <input id="arquivo" type="file" accept=".csv,.txt,text/csv" onChange={aoEnviarArquivo} />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="planilha">Ou cole aqui</label>
          <textarea
            id="planilha"
            rows={7}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={EXEMPLO}
            spellCheck={false}
            style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5 }}
          />
          <span className="field-hint">
            Só o <strong>nome</strong> é obrigatório. As outras colunas entram se estiverem lá,
            em qualquer ordem.
          </span>
        </div>

        {texto.trim() && (
          <button className="btn small secondary" type="button" onClick={() => setTexto("")}>
            Limpar
          </button>
        )}
      </div>

      {leitura && (
        <div className="panel">
          <h2 className="section-title">
            <Icon name="search" size={17} /> 2. Confira antes de gravar
          </h2>

          {leitura.erros.length > 0 && (
            <div className="alerta-plano">
              <Icon name="alert" size={20} />
              <div>
                <h3>
                  {leitura.erros.length === 1
                    ? "1 linha não será importada"
                    : `${leitura.erros.length} linhas não serão importadas`}
                </h3>
                <ul>
                  {leitura.erros.slice(0, 8).map((e, i) => (
                    <li key={i}>
                      Linha {e.linha}: {e.motivo} — <code>{e.conteudo.slice(0, 70)}</code>
                    </li>
                  ))}
                </ul>
                {leitura.erros.length > 8 && (
                  <p className="ressalva">e mais {leitura.erros.length - 8}.</p>
                )}
              </div>
            </div>
          )}

          {reconhecidas.length > 0 && (
            <p style={{ fontSize: 13.5, marginTop: 0 }}>
              <strong>Colunas reconhecidas:</strong>{" "}
              {reconhecidas.map((c) => (
                <span className="tag-restricao" key={c.indice}>
                  {c.original} → {ROTULOS[c.campo!]}
                </span>
              ))}
              {ignoradas.length > 0 && (
                <>
                  <br />
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    Ignoradas (o sistema não tem onde guardar):{" "}
                    {ignoradas.map((c) => c.original || "(sem título)").join(", ")}
                  </span>
                </>
              )}
            </p>
          )}

          {podeImportar ? (
            <>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Nome</th>
                      <th>Contato</th>
                      <th>Nascimento</th>
                      <th>Objetivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leitura.pacientes.slice(0, 25).map((p) => (
                      <tr key={p.linha}>
                        <td className="muted">{p.linha}</td>
                        <td>
                          <strong>{p.name}</strong>
                          {p.sex && <span className="muted"> · {p.sex}</span>}
                          {p.avisos.map((a, i) => (
                            <div key={i} className="item-alerta" style={{ marginLeft: 0 }}>
                              <Icon name="alert" size={11} /> {a}
                            </div>
                          ))}
                        </td>
                        <td>{p.phone ?? p.email ?? "—"}</td>
                        <td>
                          {p.birthDate
                            ? p.birthDate.toLocaleDateString("pt-BR", {
                                timeZone: "America/Sao_Paulo",
                              })
                            : "—"}
                        </td>
                        <td>{p.goal ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {leitura.pacientes.length > 25 && (
                <p className="muted" style={{ fontSize: 13 }}>
                  Mostrando as 25 primeiras de {leitura.pacientes.length}.
                </p>
              )}

              <form action={importPatients} style={{ marginTop: 14 }}>
                <input type="hidden" name="planilha" value={texto} />
                <button className="btn" type="submit">
                  <Icon name="check" size={15} /> Importar {leitura.pacientes.length}{" "}
                  {leitura.pacientes.length === 1 ? "paciente" : "pacientes"}
                </button>
              </form>
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
                Quem já estiver cadastrado nesta conta (mesmo nome e contato) é pulado — dá
                para importar de novo sem duplicar ninguém.
              </p>
            </>
          ) : (
            <p className="empty">
              Nenhum paciente para importar. Confira se a primeira linha é o cabeçalho e se
              existe uma coluna de nome.
            </p>
          )}
        </div>
      )}
    </>
  );
}
