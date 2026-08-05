import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { formatDateTime } from "@/lib/datetime";
import { Icon } from "@/lib/icons";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const FILTROS = [
  { value: "ativo", label: "Ativos" },
  { value: "todos", label: "Todos" },
  { value: "inativo", label: "Inativos" },
  { value: "alta", label: "Alta" },
];

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    excluido?: string;
    importados?: string;
    repetidos?: string;
  }>;
}) {
  const { q, status, excluido, importados, repetidos } = await searchParams;
  const nutritionist = await getCurrentNutritionist();

  // Padrão é mostrar só quem está em acompanhamento — é a lista de trabalho.
  const filtro = FILTROS.some((f) => f.value === status) ? status! : "ativo";

  const [patients, contagem] = await Promise.all([
    prisma.patient.findMany({
    where: {
      nutritionistId: nutritionist.id,
      ...(filtro === "todos" ? {} : { status: filtro }),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      measurements: { orderBy: { date: "desc" }, take: 1 },
      appointments: {
        where: { status: "agendada", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        take: 1,
      },
    },
    }),
    // Contagem por situação, para os números nas abas de filtro
    prisma.patient.groupBy({
      by: ["status"],
      where: { nutritionistId: nutritionist.id },
      _count: true,
    }),
  ]);

  const porStatus = new Map(contagem.map((c) => [c.status, c._count]));
  const total = contagem.reduce((s, c) => s + c._count, 0);
  const contarFiltro = (v: string) => (v === "todos" ? total : (porStatus.get(v) ?? 0));

  return (
    <>
      {excluido && (
        <p className="auth-error success">
          ✓ Paciente excluído. Todos os dados dele foram apagados definitivamente.
        </p>
      )}

      {importados &&
        (() => {
          const novos = Number(importados);
          const pulados = Number(repetidos);
          return (
            <p className="auth-error success">
              ✓{" "}
              {novos === 0
                ? "Nenhum paciente novo"
                : `${novos} paciente${novos === 1 ? "" : "s"} importado${novos === 1 ? "" : "s"}`}
              .
              {pulados > 0 &&
                (pulados === 1
                  ? " 1 já estava cadastrado e foi pulado."
                  : ` ${pulados} já estavam cadastrados e foram pulados.`)}
            </p>
          );
        })()}

      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">👥</span>
          <div>
            <h1>Pacientes</h1>
            <p>
              {patients.length} paciente{patients.length === 1 ? "" : "s"}
              {filtro !== "todos" ? ` · ${FILTROS.find((f) => f.value === filtro)!.label.toLowerCase()}` : ""}
              {q ? ` · busca por "${q}"` : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn secondary" href="/pacientes/importar">
            <Icon name="export" size={15} /> Importar planilha
          </Link>
          <Link className="btn" href="/pacientes/novo">
            <Icon name="plus" size={15} /> Novo paciente
          </Link>
        </div>
      </div>

      <div className="list-controls">
        <form className="searchbar">
          <span className="searchbar-icon">
            <Icon name="search" size={16} />
          </span>
          <input type="search" name="q" placeholder="Buscar por nome…" defaultValue={q ?? ""} />
          {filtro !== "ativo" && <input type="hidden" name="status" value={filtro} />}
        </form>

        <div className="filter-chips">
          {FILTROS.map((f) => {
            const href = `/pacientes?status=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
            return (
              <Link
                key={f.value}
                href={href}
                className={`filter-chip${filtro === f.value ? " active" : ""}`}
              >
                {f.label} <span>{contarFiltro(f.value)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="panel empty-state">
          <span className="empty-emoji">🔍</span>
          <h2>Nenhum paciente encontrado</h2>
          <p className="muted">
            {q ? (
              <>
                Nada para &quot;{q}&quot;. <Link href={`/pacientes?status=${filtro}`}>Limpar busca</Link>.
              </>
            ) : total > 0 ? (
              // Existem pacientes, só não neste filtro — dizer "cadastre o
              // primeiro" aqui seria enganoso.
              <>
                Nenhum paciente nesta situação.{" "}
                <Link href="/pacientes?status=todos">Ver todos os {total}</Link>.
              </>
            ) : (
              <>
                Comece cadastrando o primeiro em{" "}
                <Link href="/pacientes/novo">Novo paciente</Link>.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>
                  <Icon name="patient" size={13} /> Nome
                </th>
                <th>
                  <Icon name="target" size={13} /> Objetivo
                </th>
                <th>
                  <Icon name="scale" size={13} /> Último peso
                </th>
                <th>
                  <Icon name="calendar" size={13} /> Próxima consulta
                </th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const lastMeasurement = p.measurements[0];
                const nextAppointment = p.appointments[0];
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/pacientes/${p.id}`} className="row-name">
                        <span className="avatar">{initials(p.name)}</span>
                        <strong>{p.name}</strong>
                      </Link>
                    </td>
                    <td>
                      {p.goal ?? "—"}
                      {p.status !== "ativo" && (
                        <span className={`badge-status ${p.status}`}>{p.status}</span>
                      )}
                    </td>
                    <td>{lastMeasurement?.weightKg ? `${lastMeasurement.weightKg} kg` : "—"}</td>
                    <td>
                      {nextAppointment ? (
                        formatDateTime(nextAppointment.scheduledAt)
                      ) : (
                        <span className="tag-warn">
                          <Icon name="alert" size={12} /> sem retorno
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
