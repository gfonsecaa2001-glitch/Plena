import Link from "next/link";
import { Icon, type IconName } from "@/lib/icons";

// Página de apresentação — o que um visitante deslogado vê em "/".
// Antes ele caía direto num formulário de login, sem entender o que é o Plena.

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "patients",
    title: "Prontuário completo",
    text: "Cadastro, anamnese, histórico e contato de cada paciente num só lugar.",
  },
  {
    icon: "trend",
    title: "Evolução em gráficos",
    text: "Peso, gordura corporal e medidas ao longo do tempo. O paciente vê o progresso.",
  },
  {
    icon: "meal",
    title: "Planos alimentares",
    text: "Monte refeições com horários e imprima em PDF para entregar — com ícones dos alimentos.",
  },
  {
    icon: "calendarCheck",
    title: "Agenda com status",
    text: "Marque realizada ou falta com um clique. Histórico completo de cada atendimento.",
  },
  {
    icon: "link",
    title: "Agendamento online",
    text: "Um link para o paciente escolher o horário sozinho. Adeus vai-e-vem de mensagens.",
  },
  {
    icon: "settings",
    title: "Google Agenda",
    text: "As consultas aparecem automaticamente no seu calendário, no computador e no celular.",
  },
];

export function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-logo">
          Plena<span>.</span>
        </div>
        <nav className="lp-nav-actions">
          <Link className="lp-link" href="/login">
            Entrar
          </Link>
          <Link className="btn" href="/cadastro">
            Criar conta grátis
          </Link>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-text">
          <span className="lp-eyebrow">CRM para nutricionistas</span>
          <h1>
            Seu consultório de nutrição, <em>pleno</em>.
          </h1>
          <p>
            Pacientes, avaliações com gráficos, agenda e planos alimentares — organizados
            num só lugar, para você cuidar do que importa: as pessoas.
          </p>
          <div className="lp-cta">
            <Link className="btn" href="/cadastro">
              Começar grátis
            </Link>
            <Link className="btn secondary" href="/login">
              Já tenho conta
            </Link>
          </div>
          <p className="lp-note">Sem cartão de crédito · Leva 2 minutos para começar</p>
        </div>

        {/* Prévia da interface, desenhada em HTML — leve e sempre nítida. */}
        <div className="lp-preview" aria-hidden>
          <div className="lp-preview-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="lp-preview-body">
            <div className="lp-preview-side">
              <div className="lp-preview-logo">Plena.</div>
              {["Início", "Pacientes", "Agenda", "Planos"].map((t, i) => (
                <div className={`lp-preview-item${i === 1 ? " active" : ""}`} key={t}>
                  {t}
                </div>
              ))}
            </div>
            <div className="lp-preview-main">
              <div className="lp-preview-cards">
                {[
                  { n: "38", l: "Pacientes" },
                  { n: "6", l: "Consultas hoje" },
                  { n: "12", l: "Avaliados" },
                ].map((c) => (
                  <div className="lp-preview-card" key={c.l}>
                    <strong>{c.n}</strong>
                    <span>{c.l}</span>
                  </div>
                ))}
              </div>
              <div className="lp-preview-panel">
                {[
                  { a: "AB", n: "Ana Beatriz", m: "68 kg" },
                  { a: "BA", n: "Bruno Alves", m: "82 kg" },
                  { a: "CM", n: "Carla Mendes", m: "75 kg" },
                ].map((r) => (
                  <div className="lp-preview-row" key={r.a}>
                    <i>{r.a}</i>
                    <span>{r.n}</span>
                    <b>{r.m}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-features">
        <h2>Tudo que o consultório precisa</h2>
        <div className="lp-feature-grid">
          {FEATURES.map((f) => (
            <div className="lp-feature" key={f.title}>
              <span className="lp-feature-icon">
                <Icon name={f.icon} size={20} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2>Comece hoje, sem custo</h2>
        <p>
          Crie sua conta e cadastre o primeiro paciente em minutos. Seus dados são só
          seus — cada nutricionista enxerga apenas os próprios pacientes.
        </p>
        <Link className="btn" href="/cadastro">
          Criar minha conta grátis
        </Link>
      </section>

      <footer className="lp-footer">
        <div className="lp-logo small">
          Plena<span>.</span>
        </div>
        <span>CRM para nutricionistas</span>
      </footer>
    </div>
  );
}
