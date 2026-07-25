import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { parseMeals } from "@/lib/mealplan";
import { formatDate } from "@/lib/datetime";
import { mealIcon, foodIcon } from "@/lib/food-icons";
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

export default async function MealPlansPage() {
  const nutritionist = await getCurrentNutritionist();

  const plans = await prisma.mealPlan.findMany({
    where: { patient: { nutritionistId: nutritionist.id } },
    orderBy: { createdAt: "desc" },
    include: { patient: true },
  });

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">🥗</span>
          <div>
            <h1>Planos alimentares</h1>
            <p>
              {plans.length} plano{plans.length === 1 ? "" : "s"} · criados pela página de cada
              paciente
            </p>
          </div>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="panel empty-state">
          <span className="empty-emoji">🍽️</span>
          <h2>Nenhum plano ainda</h2>
          <p className="muted">
            Abra um paciente em <Link href="/pacientes">Pacientes</Link> e monte o primeiro plano
            alimentar.
          </p>
        </div>
      ) : (
        <div className="plan-grid">
          {plans.map((plan) => {
            const meals = parseMeals(plan.content);
            const preview = meals.flatMap((m) => m.items).slice(0, 6);
            return (
              <Link className="plan-card" key={plan.id} href={`/planos/${plan.id}`}>
                <div className="plan-card-head">
                  <span className="avatar">{initials(plan.patient.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{plan.title}</strong>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {plan.patient.name}
                    </div>
                  </div>
                </div>

                <div className="plan-meals">
                  {meals.slice(0, 5).map((m, i) => (
                    <span key={i} className="meal-chip" title={m.name}>
                      {mealIcon(m.name)} {m.name}
                    </span>
                  ))}
                  {meals.length === 0 && <span className="muted">Plano vazio</span>}
                </div>

                {preview.length > 0 && (
                  <div className="plan-foods">
                    {preview.map((item, i) => (
                      <span key={i} title={item}>
                        {foodIcon(item)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="plan-card-foot">
                  <span>
                    <Icon name="meal" size={13} /> {meals.length} refeições
                  </span>
                  <span>{formatDate(plan.createdAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
