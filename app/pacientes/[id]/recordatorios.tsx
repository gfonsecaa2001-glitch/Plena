import { Icon } from "@/lib/icons";
import { formatDate } from "@/lib/datetime";
import { parseDiario, progresso } from "@/lib/diary";
import { isShareActive, shareUrl, siteUrl } from "@/lib/share";
import { pedirRecordatorio } from "@/lib/whatsapp";
import { WaButton } from "@/app/wa-button";
import { createFoodDiary, revokeFoodDiary, deleteFoodDiary } from "@/app/actions";

type Diario = {
  id: string;
  token: string | null;
  expiresAt: Date | null;
  days: number;
  content: string;
  submittedAt: Date | null;
  createdAt: Date;
};

export function Recordatorios({
  patientId,
  patientName,
  patientPhone,
  nutriName,
  diarios,
}: {
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  nutriName: string;
  diarios: Diario[];
}) {
  const agora = new Date();

  return (
    <div className="panel">
      <h2 className="section-title">
        <Icon name="clipboard" size={17} /> Recordatório alimentar
      </h2>
      <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
        O paciente anota pelo celular o que comeu, sem login. Mandar antes da consulta
        economiza os primeiros quinze minutos do atendimento.
      </p>

      <form className="inline-form" action={createFoodDiary}>
        <input type="hidden" name="patientId" value={patientId} />
        <div className="field">
          <label htmlFor="days">Quantos dias</label>
          <select id="days" name="days" defaultValue="3">
            <option value="1">1 dia</option>
            <option value="3">3 dias</option>
            <option value="5">5 dias</option>
            <option value="7">7 dias</option>
          </select>
        </div>
        <button className="btn small" type="submit">
          <Icon name="plus" size={13} /> Pedir recordatório
        </button>
      </form>

      {diarios.length === 0 ? (
        <p className="empty">Nenhum recordatório pedido ainda.</p>
      ) : (
        diarios.map((d) => {
          const dias = parseDiario(d.content);
          const p = progresso(dias);
          const ativo = isShareActive(d.token, d.expiresAt, agora);
          const link = ativo ? shareUrl(d.token!, siteUrl(), "recordatorio") : null;

          return (
            <div className="diary-read" key={d.id}>
              <h4>
                {d.days === 1 ? "1 dia" : `${d.days} dias`} · pedido em {formatDate(d.createdAt)}
                {d.submittedAt ? (
                  <span className="badge realizada" style={{ marginLeft: 8 }}>
                    respondido em {formatDate(d.submittedAt)}
                  </span>
                ) : (
                  <span className="badge agendada" style={{ marginLeft: 8 }}>
                    {p.refeicoesPreenchidas > 0 ? "preenchendo" : "aguardando"}
                  </span>
                )}
              </h4>

              {/* Enquanto não foi enviado, o que importa é fazer o link chegar. */}
              {!d.submittedAt && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 10px" }}>
                  {link && (
                    <WaButton
                      phone={patientPhone}
                      message={pedirRecordatorio(patientName, nutriName, d.days, link)}
                      label="Mandar link"
                      small
                    />
                  )}
                  {link ? (
                    <form action={revokeFoodDiary}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="btn small secondary" type="submit">
                        <Icon name="lock" size={13} /> Desligar link
                      </button>
                    </form>
                  ) : (
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      Link desligado ou vencido.
                    </span>
                  )}
                  <form action={deleteFoodDiary}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="btn small secondary danger" type="submit">
                      <Icon name="trash" size={13} /> Excluir
                    </button>
                  </form>
                </div>
              )}

              {p.refeicoesPreenchidas === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>
                  Ainda sem resposta.
                </p>
              ) : (
                dias
                  .filter((dia) => dia.refeicoes.some((r) => r.texto.trim()))
                  .map((dia, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                        {formatDate(new Date(`${dia.data}T12:00:00-03:00`))}
                        {!dia.tipico && (
                          <span className="tag-warn" style={{ marginLeft: 6 }}>
                            fora da rotina
                          </span>
                        )}
                      </div>
                      {dia.refeicoes
                        .filter((r) => r.texto.trim())
                        .map((r, j) => (
                          <div className="diary-read-meal" key={j}>
                            <b>
                              {r.nome}
                              {r.hora ? ` · ${r.hora}` : ""}:
                            </b>{" "}
                            {r.texto}
                          </div>
                        ))}
                      {dia.obs && (
                        <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                          Observação: {dia.obs}
                        </div>
                      )}
                    </div>
                  ))
              )}

              {d.submittedAt && (
                <form action={deleteFoodDiary}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="btn small secondary danger" type="submit">
                    <Icon name="trash" size={13} /> Excluir registro
                  </button>
                </form>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
