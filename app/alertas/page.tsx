import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { formatDate, formatDateTime, relativeDays, daysSince, todayISO } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import { Icon } from "@/lib/icons";
import { retomarContato, cobrancaPendente, lembreteConsulta } from "@/lib/whatsapp";
import { inicioDeHoje } from "@/lib/charges";
import { WaButton } from "@/app/wa-button";

export const dynamic = "force-dynamic";

// Quantos dias sem consulta até considerarmos que o paciente sumiu.
// 45 dias é um retorno mensal atrasado em duas semanas — cedo o bastante para
// a conversa ainda ser natural, tarde o bastante para não incomodar quem só
// remarcou.
const DIAS_SEM_RETORNO = 45;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function AlertasPage() {
  const nutritionist = await getCurrentNutritionist();
  const agora = new Date();
  // Vencida é quem venceu ANTES de hoje — quem vence hoje ainda está no prazo.
  const limiteVencidas = inicioDeHoje(todayISO());
  const proximosSeteDias = new Date(agora.getTime() + 7 * 86400000);

  const [ativos, consultasSemEvolucao, vencidas, proximas] = await Promise.all([
    // Todos os pacientes ativos, com a última consulta realizada.
    prisma.patient.findMany({
      where: { nutritionistId: nutritionist.id, status: "ativo" },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        appointments: {
          where: { status: "realizada" },
          orderBy: { scheduledAt: "desc" },
          take: 1,
          select: { scheduledAt: true },
        },
        // Consulta futura já marcada: quem tem retorno agendado não sumiu.
        _count: {
          select: { appointments: { where: { scheduledAt: { gte: agora }, status: "agendada" } } },
        },
      },
    }),

    // Consulta que aconteceu mas ficou sem evolução escrita. É o buraco mais
    // comum no prontuário — e o que dá dor de cabeça em fiscalização do CRN.
    prisma.appointment.findMany({
      where: {
        nutritionistId: nutritionist.id,
        status: "realizada",
        scheduledAt: { lt: agora },
      },
      orderBy: { scheduledAt: "desc" },
      take: 60,
      include: { patient: { select: { id: true, name: true } } },
    }),

    prisma.charge.findMany({
      where: {
        nutritionistId: nutritionist.id,
        status: "pendente",
        dueDate: { lt: limiteVencidas },
      },
      orderBy: { dueDate: "asc" },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    }),

    prisma.appointment.findMany({
      where: {
        nutritionistId: nutritionist.id,
        status: "agendada",
        scheduledAt: { gte: agora, lte: proximosSeteDias },
      },
      orderBy: { scheduledAt: "asc" },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    }),
  ]);

  // Quais dessas consultas realizadas não têm nenhuma evolução vinculada?
  // Uma consulta só ao banco em vez de uma por consulta.
  const idsComEvolucao = new Set(
    (
      await prisma.note.findMany({
        where: { appointmentId: { in: consultasSemEvolucao.map((a) => a.id) } },
        select: { appointmentId: true },
      })
    ).map((n) => n.appointmentId)
  );
  const semEvolucao = consultasSemEvolucao.filter((a) => !idsComEvolucao.has(a.id)).slice(0, 15);

  // Sumidos: sem retorno marcado e sem consulta há muito tempo.
  const sumidos = ativos
    .filter((p) => p._count.appointments === 0)
    .map((p) => {
      const ultima = p.appointments[0]?.scheduledAt ?? null;
      // Quem nunca veio conta a partir do cadastro — senão o paciente novo
      // apareceria aqui no primeiro dia, com "nunca".
      const referencia = ultima ?? p.createdAt;
      return { ...p, ultima, dias: daysSince(referencia) };
    })
    .filter((p) => p.dias >= DIAS_SEM_RETORNO)
    .sort((a, b) => b.dias - a.dias);

  const total = sumidos.length + semEvolucao.length + vencidas.length;

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">🔔</span>
          <div>
            <h1>Alertas</h1>
            <p>
              {total === 0
                ? "Nada pendente — está tudo em dia"
                : `${total} ${total === 1 ? "item pede" : "itens pedem"} sua atenção`}
            </p>
          </div>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-icon">
            <Icon name="patients" size={17} />
          </div>
          <div className="stat">{sumidos.length}</div>
          <div className="label">Sem retorno marcado</div>
        </div>
        <div className="card">
          <div className="card-icon">
            <Icon name="clipboard" size={17} />
          </div>
          <div className="stat">{semEvolucao.length}</div>
          <div className="label">Consultas sem evolução</div>
        </div>
        <div className="card">
          <div className="card-icon">
            <Icon name="wallet" size={17} />
          </div>
          <div className="stat">{vencidas.length}</div>
          <div className="label">Cobranças vencidas</div>
        </div>
        <div className="card">
          <div className="card-icon">
            <Icon name="calendarCheck" size={17} />
          </div>
          <div className="stat">{proximas.length}</div>
          <div className="label">Consultas nos próximos 7 dias</div>
        </div>
      </div>

      {/* Pacientes que sumiram */}
      <div className="panel">
        <h2 className="section-title">
          <Icon name="patients" size={17} /> Pacientes sem retorno
        </h2>
        <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
          Ativos há mais de {DIAS_SEM_RETORNO} dias sem consulta e sem retorno marcado.
          Quem já tem data agendada não aparece aqui.
        </p>

        {sumidos.length === 0 ? (
          <div className="empty-inline">
            <span className="empty-emoji small">🌱</span>
            <p className="muted">Ninguém sumiu. Todo mundo com retorno em dia.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <Icon name="patient" size={13} /> Paciente
                </th>
                <th>Última consulta</th>
                <th>Tempo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sumidos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pacientes/${p.id}`} className="row-name">
                      <span className="avatar">{initials(p.name)}</span>
                      <strong>{p.name}</strong>
                    </Link>
                  </td>
                  <td>
                    {p.ultima ? (
                      formatDate(p.ultima)
                    ) : (
                      <span className="muted">nunca veio — cadastrado em {formatDate(p.createdAt)}</span>
                    )}
                  </td>
                  <td>
                    <span className="tag-warn">{relativeDays(p.ultima ?? p.createdAt)}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <WaButton
                      phone={p.phone}
                      message={retomarContato(p.name, nutritionist.name, p.dias)}
                      label="Chamar de volta"
                      small
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Prontuário incompleto */}
      <div className="panel">
        <h2 className="section-title">
          <Icon name="clipboard" size={17} /> Consultas sem evolução registrada
        </h2>
        <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
          A consulta aconteceu, mas nada foi escrito no prontuário. Registrar a evolução
          é obrigação do CRN — e é o que faz a próxima consulta render.
        </p>

        {semEvolucao.length === 0 ? (
          <div className="empty-inline">
            <span className="empty-emoji small">✍️</span>
            <p className="muted">Todas as consultas realizadas têm evolução escrita.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <Icon name="patient" size={13} /> Paciente
                </th>
                <th>Consulta</th>
                <th>Quando</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {semEvolucao.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/pacientes/${a.patientId}`} className="row-name">
                      <span className="avatar">{initials(a.patient.name)}</span>
                      <strong>{a.patient.name}</strong>
                    </Link>
                  </td>
                  <td>{formatDateTime(a.scheduledAt)}</td>
                  <td>{relativeDays(a.scheduledAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn small secondary" href={`/pacientes/${a.patientId}`}>
                      Escrever evolução
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dinheiro atrasado */}
      <div className="panel">
        <h2 className="section-title">
          <Icon name="wallet" size={17} /> Cobranças vencidas
        </h2>

        {vencidas.length === 0 ? (
          <div className="empty-inline">
            <span className="empty-emoji small">💚</span>
            <p className="muted">Nenhuma cobrança atrasada.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <Icon name="patient" size={13} /> Paciente
                </th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Venceu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vencidas.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/pacientes/${c.patientId}`} className="row-name">
                      <span className="avatar">{initials(c.patient.name)}</span>
                      <strong>{c.patient.name}</strong>
                    </Link>
                  </td>
                  <td>{c.description}</td>
                  <td>
                    <strong>{formatCents(c.amountCents)}</strong>
                  </td>
                  <td>
                    <span className="tag-warn">{relativeDays(c.dueDate!)}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <WaButton
                      phone={c.patient.phone}
                      message={cobrancaPendente(
                        c.patient.name,
                        nutritionist.name,
                        c.description,
                        formatCents(c.amountCents),
                        c.dueDate
                      )}
                      label="Cobrar"
                      small
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lembretes da semana */}
      <div className="panel">
        <h2 className="section-title">
          <Icon name="bell" size={17} /> Lembretes da semana
        </h2>
        <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
          Consultas dos próximos 7 dias. Avisar reduz falta — e a mensagem já vai pronta.
        </p>

        {proximas.length === 0 ? (
          <div className="empty-inline">
            <span className="empty-emoji small">🗓️</span>
            <p className="muted">Nenhuma consulta marcada para os próximos 7 dias.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>
                  <Icon name="patient" size={13} /> Paciente
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {proximas.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.scheduledAt)}</td>
                  <td>
                    <Link href={`/pacientes/${a.patientId}`} className="row-name">
                      <span className="avatar">{initials(a.patient.name)}</span>
                      <strong>{a.patient.name}</strong>
                    </Link>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <WaButton
                      phone={a.patient.phone}
                      message={lembreteConsulta(a.patient.name, nutritionist.name, a.scheduledAt)}
                      label="Lembrar"
                      small
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
