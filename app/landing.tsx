import Link from "next/link";
import { Icon, type IconName } from "@/lib/icons";

// Página de apresentação — o que um visitante deslogado vê em "/".
//
// As "telas" mostradas nas seções são recriadas em HTML, não são imagens:
// ficam nítidas em qualquer resolução, carregam rápido e acompanham a
// identidade visual sem precisar refazer print a cada mudança.

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
    title: "Planos que calculam",
    text: "Tabela TACO integrada: escolha o alimento, informe a quantidade e veja kcal e macros.",
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

const FAQ = [
  {
    q: "Os dados dos meus pacientes ficam seguros?",
    a: "Sim. Cada nutricionista enxerga apenas os próprios pacientes — o isolamento é aplicado no servidor, em toda consulta ao banco. Senhas nunca são guardadas em texto, apenas o hash. Nem o administrador da plataforma tem acesso aos prontuários: o painel administrativo mostra só métricas de uso, nunca dados clínicos.",
  },
  {
    q: "De onde vêm os valores nutricionais?",
    a: "Da TACO — Tabela Brasileira de Composição de Alimentos (NEPA/UNICAMP), a referência usada por nutricionistas no Brasil. São 591 alimentos com calorias, proteínas, carboidratos, gorduras, fibras e sódio por 100 g.",
  },
  {
    q: "O sistema prescreve a dieta por mim?",
    a: "Não, e isso é proposital. O Plena estima o gasto energético (TMB e GET) por fórmulas populacionais e soma os macros do plano, mas a meta e a prescrição são sempre digitadas por você. A decisão clínica é do profissional.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. O Plena roda no navegador e se adapta a telas pequenas — você atende com o notebook e consulta a agenda pelo celular, sem instalar nada.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "Nada. É só criar a conta e usar. Atualizações chegam sozinhas, sem você fazer nada.",
  },
  {
    q: "E se eu já tiver meus pacientes numa planilha?",
    a: "Você pode cadastrá-los aos poucos, conforme forem consultando — não precisa migrar tudo de uma vez para começar a usar.",
  },
];

/* ---------- Recriações de tela usadas nas seções ---------- */

function MockNutrition() {
  const itens = [
    { icon: "🍚", nome: "120 g de Arroz, integral, cozido", kcal: 148 },
    { icon: "🫘", nome: "100 g de Feijão, carioca, cozido", kcal: 76 },
    { icon: "🍗", nome: "150 g de Frango, peito, grelhado", kcal: 239 },
    { icon: "🥗", nome: "60 g de Alface, crespa, crua", kcal: 8 },
  ];
  return (
    <div className="mock">
      <div className="mock-head">
        <span>Almoço · 12:30</span>
        <strong>471 kcal</strong>
      </div>
      {itens.map((i) => (
        <div className="mock-row" key={i.nome}>
          <span className="mock-emoji">{i.icon}</span>
          <span className="mock-name">{i.nome}</span>
          <b>{i.kcal} kcal</b>
        </div>
      ))}
      <div className="mock-targets">
        {[
          { l: "Calorias", v: "1.580 / 1.600", w: 99, on: true },
          { l: "Proteína", v: "108 / 110 g", w: 98, on: true },
          { l: "Carboidrato", v: "94 / 160 g", w: 59, on: false },
        ].map((t) => (
          <div key={t.l}>
            <div className="mock-target-head">
              <span>{t.l}</span>
              <span>{t.v}</span>
            </div>
            <div className="mock-track">
              <div className={`mock-fill${t.on ? " on" : ""}`} style={{ width: `${t.w}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockChart() {
  // Linha de evolução do peso — mesmo desenho do gráfico real do app.
  const pontos = [
    [10, 26],
    [70, 40],
    [130, 52],
    [190, 70],
    [250, 82],
  ];
  const d = pontos.map((p) => p.join(",")).join(" ");
  return (
    <div className="mock">
      <div className="mock-head">
        <span>Peso (kg)</span>
        <strong>−6,5 kg em 3 meses</strong>
      </div>
      <svg viewBox="0 0 270 100" className="mock-chart" aria-hidden>
        {[20, 45, 70, 95].map((y) => (
          <line key={y} x1="8" x2="262" y1={y} y2={y} stroke="#e4e2d4" strokeWidth="1" />
        ))}
        <polyline
          points={d}
          fill="none"
          stroke="#345c1f"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pontos.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="3.5" fill="#345c1f" stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
      <div className="mock-legend">
        <span>abr</span>
        <span>mai</span>
        <span>jun</span>
        <span>jul</span>
      </div>
    </div>
  );
}

function MockBooking() {
  return (
    <div className="mock">
      <div className="mock-head">
        <span>Agendar consulta</span>
        <strong>com Ana Souza</strong>
      </div>
      <div className="mock-days">
        {[
          ["seg", "28"],
          ["ter", "29"],
          ["qua", "30"],
          ["qui", "31"],
        ].map(([d, n], i) => (
          <div className={`mock-day${i === 1 ? " active" : ""}`} key={n}>
            <span>{d}</span>
            <b>{n}</b>
          </div>
        ))}
      </div>
      <div className="mock-slots">
        {["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"].map((h, i) => (
          <div className={`mock-slot${i === 3 ? " chosen" : ""}`} key={h}>
            {h}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Página ---------- */

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
            Prontuário, avaliações com gráficos, agenda e planos alimentares que calculam
            calorias e macros — tudo num só lugar, para você cuidar do que importa: as pessoas.
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

      {/* Antes x depois */}
      <section className="lp-compare">
        <h2>Do caderno e da planilha para um sistema só</h2>
        <div className="lp-compare-grid">
          <div className="lp-compare-col before">
            <h3>Como costuma ser</h3>
            <ul>
              <li>Prontuário no caderno, planilha ou no Word</li>
              <li>Calorias calculadas na mão ou em outro programa</li>
              <li>Horário marcado no vai-e-vem do WhatsApp</li>
              <li>Evolução do paciente espalhada em vários arquivos</li>
              <li>Plano montado do zero a cada consulta</li>
            </ul>
          </div>
          <div className="lp-compare-col after">
            <h3>Com o Plena</h3>
            <ul>
              <li>Prontuário, medidas e histórico num lugar só</li>
              <li>Tabela TACO calcula kcal e macros enquanto você monta</li>
              <li>Link de agendamento: o paciente escolhe sozinho</li>
              <li>Gráficos de evolução gerados automaticamente</li>
              <li>Plano pronto para imprimir e entregar em PDF</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Recursos em detalhe */}
      <section className="lp-detail">
        <div className="lp-detail-row">
          <div className="lp-detail-text">
            <span className="lp-eyebrow">Cálculo nutricional</span>
            <h2>A conta é feita enquanto você monta o plano</h2>
            <p>
              Busque o alimento na <strong>tabela TACO</strong> (591 itens do NEPA/UNICAMP),
              informe a quantidade em gramas e pronto: o Plena soma calorias e macros por
              alimento, por refeição e no total do dia — e compara com a meta que você
              prescreveu.
            </p>
            <ul className="lp-checks">
              <li>TMB por Mifflin-St Jeor e Harris-Benedict</li>
              <li>Gasto total com fator de atividade</li>
              <li>Barras que ficam verdes quando o plano bate a meta</li>
            </ul>
          </div>
          <div className="lp-detail-visual">
            <MockNutrition />
          </div>
        </div>

        <div className="lp-detail-row reverse">
          <div className="lp-detail-text">
            <span className="lp-eyebrow">Evolução</span>
            <h2>O progresso que motiva o paciente</h2>
            <p>
              Cada avaliação vira um ponto no gráfico. Peso, percentual de gordura e medidas
              ao longo do tempo — fácil de mostrar na consulta e difícil de esquecer.
            </p>
            <ul className="lp-checks">
              <li>IMC calculado automaticamente</li>
              <li>Histórico completo de cada avaliação</li>
              <li>Alerta de quem está sem retorno marcado</li>
            </ul>
          </div>
          <div className="lp-detail-visual">
            <MockChart />
          </div>
        </div>

        <div className="lp-detail-row">
          <div className="lp-detail-text">
            <span className="lp-eyebrow">Agendamento online</span>
            <h2>Seu horário marcado sem trocar mensagem</h2>
            <p>
              Um link para mandar no WhatsApp ou colocar na bio do Instagram. O paciente vê
              só os horários livres, escolhe e pronto: entra na sua agenda e no seu Google
              Agenda, com o cadastro já criado.
            </p>
            <ul className="lp-checks">
              <li>Você define dias, horários e duração</li>
              <li>Horário ocupado nunca é oferecido</li>
              <li>Desligue quando estiver de férias</li>
            </ul>
          </div>
          <div className="lp-detail-visual">
            <MockBooking />
          </div>
        </div>
      </section>

      {/* Todos os recursos */}
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

      {/* Preço */}
      <section className="lp-pricing">
        <div className="lp-price-card">
          <span className="lp-badge-beta">Fase inicial</span>
          <h2>Grátis enquanto estamos construindo</h2>
          <p>
            O Plena está em evolução e é <strong>gratuito neste período</strong>, com todos os
            recursos liberados. Em troca, o que a gente pede é seu retorno: o que falta, o que
            atrapalha, o que você faria diferente.
          </p>
          <ul className="lp-checks center">
            <li>Todos os recursos, sem limite de pacientes</li>
            <li>Sem cartão de crédito</li>
            <li>Seus dados são seus — e continuam sendo</li>
          </ul>
          <Link className="btn" href="/cadastro">
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* Depoimentos — estrutura pronta, conteúdo a preencher */}
      <section className="lp-testimonials">
        <h2>Quem já está usando</h2>
        <p className="lp-section-sub">
          Os primeiros nutricionistas estão começando agora. Em breve, o que eles acharam.
        </p>
        <div className="lp-testimonial-grid">
          {[1, 2, 3].map((i) => (
            <div className="lp-testimonial empty" key={i}>
              <div className="lp-quote-mark">”</div>
              <p>Espaço reservado para o depoimento de quem usa o Plena no dia a dia.</p>
              <div className="lp-testimonial-author">
                <span className="lp-testimonial-avatar" />
                <div>
                  <strong>Seu nome aqui</strong>
                  <span>Nutricionista · CRN</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq">
        <h2>Perguntas frequentes</h2>
        <div className="lp-faq-list">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <span className="lp-faq-mark" aria-hidden />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2>Comece hoje, sem custo</h2>
        <p>
          Crie sua conta e cadastre o primeiro paciente em minutos. Cada nutricionista enxerga
          apenas os próprios pacientes.
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
