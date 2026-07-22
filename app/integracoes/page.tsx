import { getCurrentNutritionist } from "@/lib/tenant";
import { isGoogleConfigured } from "@/lib/google-calendar";
import { disconnectGoogle } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const nutritionist = await getCurrentNutritionist();
  const connected = Boolean(nutritionist.googleRefreshToken);
  const configured = isGoogleConfigured();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Integrações</h1>
          <p>Conecte o Plena às ferramentas que você já usa</p>
        </div>
      </div>

      {ok && <p className="auth-error success">✓ Google Agenda conectado com sucesso!</p>}
      {erro === "negado" && (
        <p className="auth-error">Autorização cancelada. Nada foi conectado.</p>
      )}
      {erro === "token" && (
        <p className="auth-error">Não foi possível concluir a conexão. Tente novamente.</p>
      )}
      {erro === "config" && (
        <p className="auth-error">A integração ainda não foi configurada no servidor.</p>
      )}

      <div className="panel integration">
        <div className="integration-head">
          <div className="integration-logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="4" width="18" height="17" rx="3" stroke="#4a6b35" strokeWidth="1.8" />
              <path d="M3 9h18M8 2v4M16 2v4" stroke="#4a6b35" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 15l2 2 4-4" stroke="#c9803f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>Google Agenda</h2>
            <p className="muted" style={{ margin: "3px 0 0", fontSize: 13.5 }}>
              As consultas que você marcar no Plena aparecem automaticamente no seu
              Google Agenda — no computador e no celular.
            </p>
          </div>
          {connected ? (
            <span className="badge realizada">conectado</span>
          ) : (
            <span className="badge cancelada">não conectado</span>
          )}
        </div>

        {connected ? (
          <div className="integration-body">
            <p style={{ fontSize: 14, margin: "0 0 12px" }}>
              Conectado à conta <strong>{nutritionist.googleEmail ?? "Google"}</strong>.
              Novas consultas serão criadas no seu calendário; mudanças de status
              (realizada, faltou) atualizam o evento.
            </p>
            <form action={disconnectGoogle}>
              <button className="btn small secondary danger" type="submit">
                Desconectar
              </button>
            </form>
          </div>
        ) : (
          <div className="integration-body">
            <ul className="integration-benefits">
              <li>Consulta marcada aqui → evento criado lá, com lembrete</li>
              <li>Mudou o status? O evento é atualizado</li>
              <li>Desconectar é seguro: não afeta seu login nem seus dados</li>
            </ul>
            {configured ? (
              <a className="btn" href="/api/google/connect">
                Conectar Google Agenda
              </a>
            ) : (
              <p className="empty">
                Integração ainda não configurada pelo administrador do sistema.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="panel integration muted-panel">
        <div className="integration-head">
          <div className="integration-logo">💬</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>Lembretes por WhatsApp</h2>
            <p className="muted" style={{ margin: "3px 0 0", fontSize: 13.5 }}>
              Aviso automático ao paciente 24h antes da consulta.
            </p>
          </div>
          <span className="badge cancelada">em breve</span>
        </div>
      </div>

      <div className="panel integration muted-panel">
        <div className="integration-head">
          <div className="integration-logo">🔗</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>Link público de agendamento</h2>
            <p className="muted" style={{ margin: "3px 0 0", fontSize: 13.5 }}>
              O paciente escolhe o horário sozinho e cai direto na sua agenda.
            </p>
          </div>
          <span className="badge cancelada">em breve</span>
        </div>
      </div>
    </>
  );
}
