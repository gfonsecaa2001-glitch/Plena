import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { parseMeals } from "@/lib/mealplan";
import { formatDate } from "@/lib/datetime";
import { mealIcon } from "@/lib/food-icons";
import { Icon } from "@/lib/icons";
import { renameTemplate, deleteTemplate } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ModelosPage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { salvo } = await searchParams;
  const nutritionist = await getCurrentNutritionist();

  const modelos = await prisma.planTemplate.findMany({
    where: { nutritionistId: nutritionist.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      {salvo && (
        <p className="auth-error success">
          ✓ Modelo salvo. Ele já aparece ao criar um plano novo.
        </p>
      )}

      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">📋</span>
          <div>
            <h1>Modelos de plano</h1>
            <p>
              {modelos.length === 0
                ? "Nenhum modelo ainda"
                : `${modelos.length} modelo${modelos.length === 1 ? "" : "s"} pronto${modelos.length === 1 ? "" : "s"} para reaproveitar`}
            </p>
          </div>
        </div>
      </div>

      {modelos.length === 0 ? (
        <div className="panel empty-state">
          <span className="empty-emoji">📋</span>
          <h2>Monte uma vez, use sempre</h2>
          <p className="muted">
            Abra um plano que ficou bom e clique em <strong>Salvar como modelo</strong>. Ele
            passa a aparecer na hora de criar um plano novo, já com as refeições, os
            alimentos e as substituições.
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            O modelo é uma cópia: mexer nele depois não altera os planos que já saíram
            dele, nem o contrário.
          </p>
          <Link className="btn" href="/planos">
            <Icon name="meal" size={15} /> Ver meus planos
          </Link>
        </div>
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Refeições</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {modelos.map((m) => {
                const meals = parseMeals(m.content);
                const itens = meals.reduce((s, r) => s + r.items.length, 0);
                return (
                  <tr key={m.id}>
                    <td>
                      <form action={renameTemplate} className="rename-form">
                        <input type="hidden" name="id" value={m.id} />
                        <input
                          name="title"
                          defaultValue={m.title}
                          aria-label="Nome do modelo"
                        />
                        <button className="btn small secondary" type="submit">
                          Renomear
                        </button>
                      </form>
                      <div className="plan-meals inline">
                        {meals.slice(0, 6).map((r, i) => (
                          <span key={i} title={r.name}>
                            {mealIcon(r.name)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {meals.length}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {itens} {itens === 1 ? "alimento" : "alimentos"}
                      </div>
                    </td>
                    <td>{formatDate(m.createdAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <form action={deleteTemplate}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="btn small secondary danger" type="submit">
                          <Icon name="trash" size={13} /> Excluir
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            Excluir um modelo não mexe em nenhum plano já criado a partir dele.
          </p>
        </div>
      )}
    </>
  );
}
