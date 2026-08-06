import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isShareActive } from "@/lib/share";
import { parseDiario, progresso } from "@/lib/diary";
import { formatDate } from "@/lib/datetime";
import { salvarRecordatorio, enviarRecordatorio } from "../actions";

export const dynamic = "force-dynamic";

// Dado de saúde não pode ser indexado. Mesma regra do link do plano.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Recordatório alimentar",
};

export default async function RecordatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ salvo?: string; erro?: string }>;
}) {
  const { token } = await params;
  const { salvo, erro } = await searchParams;

  if (!token || token.length < 20) notFound();

  const diario = await prisma.foodDiary.findUnique({
    where: { token },
    include: {
      patient: {
        select: { name: true, nutritionist: { select: { name: true, clinic: true } } },
      },
    },
  });

  // Token inexistente e link vencido dão a mesma tela — não confirmamos que
  // aquele endereço existiu.
  if (!diario || !isShareActive(diario.token, diario.expiresAt, new Date())) notFound();

  const dias = parseDiario(diario.content);
  const p = progresso(dias);
  const nutri = diario.patient.nutritionist;
  const primeiroNome = diario.patient.name.split(" ")[0];

  if (diario.submittedAt) {
    return (
      <div className="public-plan" style={{ textAlign: "center", paddingTop: 60 }}>
        <span style={{ fontSize: 46 }}>✅</span>
        <h1 style={{ fontSize: 24, margin: "14px 0 8px" }}>Recebido, {primeiroNome}!</h1>
        <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6 }}>
          Seu registro chegou para {nutri.name} em {formatDate(diario.submittedAt)}. Obrigado
          por preencher — é isso que deixa a próxima consulta mais certeira.
        </p>
      </div>
    );
  }

  return (
    <div className="public-plan">
      <header className="public-plan-head">
        <div>
          <p className="public-plan-eyebrow">Recordatório alimentar</p>
          <h1>Oi, {primeiroNome}!</h1>
          <p className="public-plan-sub">
            {nutri.clinic || nutri.name} pediu que você anote o que comeu em{" "}
            {diario.days === 1 ? "1 dia" : `${diario.days} dias`}.
          </p>
        </div>
      </header>

      <div className="diary-intro">
        <p>
          <strong>Escreva do seu jeito.</strong> &quot;2 pães com manteiga e café com
          leite&quot; já basta — não precisa pesar nada nem saber calorias. Quem calcula é a
          nutricionista.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Vale mais registrar o dia real do que o dia ideal. Se comeu pizza, escreva pizza:
          é isso que permite ajustar o plano à sua vida.
        </p>
      </div>

      {salvo && <p className="auth-error success">✓ Salvo. Você pode voltar depois pelo mesmo link.</p>}
      {erro === "vazio" && (
        <p className="auth-error">Escreva ao menos uma refeição antes de enviar.</p>
      )}
      {erro === "limite" && (
        <p className="auth-error">Muitas gravações seguidas. Espere alguns minutos.</p>
      )}

      <form>
        <input type="hidden" name="token" value={token} />

        {dias.map((dia, i) => (
          <section className="panel diary-day" key={i}>
            <div className="diary-day-head">
              <h2>Dia {i + 1}</h2>
              <input type="date" name={`dia-${i}-data`} defaultValue={dia.data} aria-label="Data" />
            </div>

            {dia.refeicoes.map((ref, j) => (
              <div className="diary-meal" key={j}>
                <div className="diary-meal-head">
                  <label htmlFor={`dia-${i}-ref-${j}`}>{ref.nome}</label>
                  <input
                    type="time"
                    name={`dia-${i}-ref-${j}-hora`}
                    defaultValue={ref.hora ?? ""}
                    aria-label={`Horário — ${ref.nome}`}
                  />
                </div>
                <textarea
                  id={`dia-${i}-ref-${j}`}
                  name={`dia-${i}-ref-${j}`}
                  rows={2}
                  defaultValue={ref.texto}
                  placeholder="O que você comeu e bebeu"
                />
              </div>
            ))}

            <div className="diary-day-foot">
              <label className="check-inline">
                <input
                  type="checkbox"
                  name={`dia-${i}-tipico`}
                  value="nao"
                  defaultChecked={!dia.tipico}
                />
                <span>foi um dia fora da rotina (viagem, festa, doença)</span>
              </label>
              <input
                name={`dia-${i}-obs`}
                defaultValue={dia.obs ?? ""}
                placeholder="Alguma observação sobre o dia? (opcional)"
              />
            </div>
          </section>
        ))}

        <div className="diary-actions">
          <button className="btn secondary" type="submit" formAction={salvarRecordatorio}>
            Salvar e continuar depois
          </button>
          <button className="btn" type="submit" formAction={enviarRecordatorio}>
            Enviar para {nutri.name.split(" ")[0]}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>
          {p.refeicoesPreenchidas === 0
            ? "Nada preenchido ainda."
            : `${p.diasPreenchidos} de ${p.totalDias} dias começados.`}{" "}
          Depois de enviar, não dá mais para alterar.
        </p>
      </form>
    </div>
  );
}
