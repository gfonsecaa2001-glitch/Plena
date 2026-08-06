import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { formatCents, centsToInput, labelMetodo, METODOS } from "@/lib/money";
import { formatDate, currentMonth, todayISO } from "@/lib/datetime";
import { estaVencida, inicioDeHoje } from "@/lib/charges";
import { Icon } from "@/lib/icons";
import { createCharge, setChargeStatus, deleteCharge, saveDefaultPrice } from "@/app/actions";
import { cobrancaPendente } from "@/lib/whatsapp";
import { WaButton } from "@/app/wa-button";

export const dynamic = "force-dynamic";

const FILTROS = [
  { value: "pendente", label: "Em aberto" },
  { value: "pago", label: "Recebidos" },
  { value: "todos", label: "Todos" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const nutritionist = await getCurrentNutritionist();
  const filtro = FILTROS.some((f) => f.value === status) ? status! : "pendente";
  const { start: inicioDoMes } = currentMonth();
  const hoje = todayISO();
  // Vencida é quem venceu ANTES de hoje. Quem vence hoje ainda está no prazo.
  const limiteVencidas = inicioDeHoje(hoje);

  const [cobrancas, pacientes, recebidoMes, emAberto, vencidas] = await Promise.all([
    prisma.charge.findMany({
      where: {
        nutritionistId: nutritionist.id,
        ...(filtro === "todos" ? {} : { status: filtro }),
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: { patient: { select: { id: true, name: true, phone: true } } },
      take: 200,
    }),
    prisma.patient.findMany({
      where: { nutritionistId: nutritionist.id, status: { not: "inativo" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.charge.aggregate({
      where: { nutritionistId: nutritionist.id, status: "pago", paidAt: { gte: inicioDoMes } },
      _sum: { amountCents: true },
    }),
    prisma.charge.aggregate({
      where: { nutritionistId: nutritionist.id, status: "pendente" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.charge.count({
      where: {
        nutritionistId: nutritionist.id,
        status: "pendente",
        dueDate: { lt: limiteVencidas },
      },
    }),
  ]);

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">💰</span>
          <div>
            <h1>Financeiro</h1>
            <p>Controle do que você já recebeu e do que está em aberto</p>
          </div>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="card-icon">
            <Icon name="checkCircle" size={17} />
          </div>
          <div className="stat">{formatCents(recebidoMes._sum.amountCents ?? 0)}</div>
          <div className="label">Recebido neste mês</div>
        </div>
        <div className="card">
          <div className="card-icon">
            <Icon name="clock" size={17} />
          </div>
          <div className="stat">{formatCents(emAberto._sum.amountCents ?? 0)}</div>
          <div className="label">
            Em aberto
            {emAberto._count > 0 && (
              <span className="delta">
                {emAberto._count} cobrança{emAberto._count === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-icon">
            <Icon name="alert" size={17} />
          </div>
          <div className="stat">{vencidas}</div>
          <div className="label">Vencidas</div>
        </div>
      </div>

      {/* Nova cobrança */}
      <div className="panel">
        <h2 className="section-title">
          <Icon name="plus" size={17} /> Nova cobrança
        </h2>

        {pacientes.length === 0 ? (
          <p className="empty">
            Cadastre um paciente em <Link href="/pacientes/novo">Pacientes</Link> para lançar
            cobranças.
          </p>
        ) : (
          <form className="inline-form" action={createCharge}>
            <div className="field" style={{ minWidth: 190 }}>
              <label htmlFor="patientId">Paciente</label>
              <select id="patientId" name="patientId" required>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 170 }}>
              <label htmlFor="description">Descrição</label>
              <input id="description" name="description" placeholder="Consulta, pacote 4 sessões…" />
            </div>
            <div className="field">
              <label htmlFor="amount">Valor</label>
              <input
                id="amount"
                name="amount"
                required
                inputMode="decimal"
                placeholder={
                  nutritionist.defaultPriceCents
                    ? centsToInput(nutritionist.defaultPriceCents)
                    : "150,00"
                }
                defaultValue={
                  nutritionist.defaultPriceCents
                    ? centsToInput(nutritionist.defaultPriceCents)
                    : ""
                }
              />
            </div>
            <div className="field">
              <label htmlFor="dueDate">Vencimento</label>
              <input id="dueDate" name="dueDate" type="date" />
            </div>
            <label className="check-inline">
              <input type="checkbox" name="jaPago" />
              <span>já recebido</span>
            </label>
            <div className="field">
              <label htmlFor="method">Forma</label>
              <select id="method" name="method" defaultValue="pix">
                {METODOS.map((m) => (
                  <option key={m} value={m}>
                    {labelMetodo(m)}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn small" type="submit">
              Lançar
            </button>
          </form>
        )}
      </div>

      {/* Lista */}
      <div className="panel">
        <div className="list-controls" style={{ marginBottom: 14 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            <Icon name="wallet" size={17} /> Cobranças
          </h2>
          <div className="filter-chips">
            {FILTROS.map((f) => (
              <Link
                key={f.value}
                href={`/financeiro?status=${f.value}`}
                className={`filter-chip${filtro === f.value ? " active" : ""}`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {cobrancas.length === 0 ? (
          <div className="empty-inline">
            <span className="empty-emoji small">🧾</span>
            <p className="muted">Nenhuma cobrança nesta situação.</p>
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
                <th>Vencimento</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cobrancas.map((c) => {
                const vencida = c.status === "pendente" && estaVencida(c.dueDate, hoje);
                return (
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
                      {c.status === "pago" && (c.method || c.paidAt) && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {[c.method ? labelMetodo(c.method) : null, c.paidAt ? formatDate(c.paidAt) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </td>
                    <td>
                      {c.dueDate ? formatDate(c.dueDate) : "—"}
                      {vencida && (
                        <span className="tag-warn" style={{ marginLeft: 6 }}>
                          vencida
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-cobranca ${c.status}`}>
                        {c.status === "pago"
                          ? "recebido"
                          : c.status === "pendente"
                            ? "em aberto"
                            : "cancelado"}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        {c.status === "pendente" && (
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
                            title="Abre o WhatsApp com a mensagem de cobrança pronta"
                          />
                        )}
                        {c.status !== "pago" && (
                          <form action={setChargeStatus}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="status" value="pago" />
                            <button className="btn small" type="submit">
                              <Icon name="check" size={13} /> Recebi
                            </button>
                          </form>
                        )}
                        {c.status === "pago" && (
                          <form action={setChargeStatus}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="status" value="pendente" />
                            <button className="btn small secondary" type="submit">
                              Desfazer
                            </button>
                          </form>
                        )}
                        <form action={deleteCharge}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            className="link-remove"
                            type="submit"
                            aria-label="Excluir cobrança"
                          >
                            ×
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Valor padrão */}
      <div className="panel">
        <h2 className="section-title">
          <Icon name="settings" size={17} /> Valor padrão da consulta
        </h2>
        <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
          Preenche o campo de valor automaticamente ao lançar uma cobrança.
        </p>
        <form className="inline-form" action={saveDefaultPrice}>
          <div className="field">
            <label htmlFor="defaultPrice">Valor</label>
            <input
              id="defaultPrice"
              name="defaultPrice"
              inputMode="decimal"
              placeholder="150,00"
              defaultValue={
                nutritionist.defaultPriceCents ? centsToInput(nutritionist.defaultPriceCents) : ""
              }
            />
          </div>
          <button className="btn small" type="submit">
            Salvar
          </button>
        </form>
      </div>
    </>
  );
}
