"use client";

// Painel do link do plano.
//
// É componente de cliente por causa do "copiar": a área de transferência só
// existe no navegador. O resto (gerar, renovar, revogar) são server actions.

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { sharePlan, revokePlanShare } from "@/app/actions";

export function SharePanel({
  planId,
  url,
  expiraEm,
  whatsappHref,
}: {
  planId: string;
  url: string | null;
  expiraEm: string | null;
  whatsappHref: string | null;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador bloqueou a área de transferência (acontece fora de HTTPS).
      // O endereço está visível na tela, então dá para selecionar à mão.
      setCopiado(false);
    }
  }

  return (
    <div className="panel no-print">
      <h2 className="section-title">
        <Icon name="link" size={17} /> Link para o paciente
      </h2>

      {!url ? (
        <>
          <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
            Gere um endereço para o paciente abrir o plano no celular. Ele sempre vê a
            versão atual — se você mudar o almoço hoje, já muda para ele.
          </p>
          <form action={sharePlan}>
            <input type="hidden" name="planId" value={planId} />
            <button className="btn small" type="submit">
              <Icon name="link" size={14} /> Gerar link
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="share-box">
            <code className="share-url">{url}</code>
            <button className="btn small secondary" type="button" onClick={copiar}>
              <Icon name={copiado ? "check" : "clipboard"} size={13} />{" "}
              {copiado ? "Copiado" : "Copiar"}
            </button>
            {whatsappHref && (
              <a
                className="btn whatsapp small"
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="whatsapp" size={13} /> Enviar
              </a>
            )}
          </div>

          <p className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>
            {expiraEm ? `O link para de funcionar em ${expiraEm}.` : "Sem prazo definido."}{" "}
            Quem tiver o endereço consegue ver o plano — por isso ele vence sozinho, e
            trocar por um novo derruba o anterior na hora.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Este botão NÃO estica o prazo: ele troca o endereço. É de
                propósito — se o link vazou, esticar a validade prolongaria o
                vazamento. O rótulo diz o que acontece de verdade. */}
            <form action={sharePlan}>
              <input type="hidden" name="planId" value={planId} />
              <button className="btn small secondary" type="submit">
                Trocar por um link novo
              </button>
            </form>
            <form action={revokePlanShare}>
              <input type="hidden" name="planId" value={planId} />
              <button className="btn small secondary danger" type="submit">
                <Icon name="lock" size={13} /> Desligar link
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
