import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseMeals } from "@/lib/mealplan";
import { formatDate } from "@/lib/datetime";
import { foodIcon, mealIcon } from "@/lib/food-icons";
import { isShareActive } from "@/lib/share";
import { ZERO, addMacros, macrosFor, roundMacros, type Macros } from "@/lib/nutrition";
import { PrintButton } from "@/app/planos/[id]/print-button";

export const dynamic = "force-dynamic";

// Plano de paciente NUNCA pode ser indexado por buscador. O endereço é
// secreto, mas basta um link ser colado em qualquer página pública para o
// robô do Google chegar até ele — e aí o "segredo" vira resultado de busca.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Seu plano alimentar",
};

// Não damos pista nenhuma sobre o motivo: token inválido, plano apagado e
// link vencido são a mesma tela. Dizer "este link expirou" já confirmaria
// para um curioso que aquele endereço existiu.
async function carregarPlano(token: string) {
  if (!token || token.length < 20) return null;

  const plan = await prisma.mealPlan.findUnique({
    where: { shareToken: token },
    include: {
      patient: {
        select: {
          name: true,
          kcalTarget: true,
          nutritionist: { select: { name: true, crn: true, phone: true, clinic: true } },
        },
      },
    },
  });

  if (!plan) return null;
  if (!isShareActive(plan.shareToken, plan.shareExpiresAt, new Date())) return null;
  return plan;
}

export default async function PlanoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const plan = await carregarPlano(token);
  if (!plan) notFound();

  const meals = parseMeals(plan.content);
  const p = plan.patient;
  const nutri = p.nutritionist;

  // Mesmo cálculo do editor: carrega os alimentos citados de uma vez só.
  const foodIds = [
    ...new Set(meals.flatMap((m) => m.items.map((i) => i.foodId).filter(Boolean))),
  ] as string[];
  const foods = foodIds.length
    ? await prisma.food.findMany({ where: { id: { in: foodIds } } })
    : [];
  const foodById = new Map(foods.map((f) => [f.id, f]));

  const macrosOf = (item: { foodId?: string; grams?: number }): Macros | null => {
    if (!item.foodId || !item.grams) return null;
    const food = foodById.get(item.foodId);
    return food ? macrosFor(food, item.grams) : null;
  };

  const mealTotals = meals.map((m) =>
    m.items.reduce((acc, item) => addMacros(acc, macrosOf(item) ?? ZERO), ZERO)
  );
  const dia = roundMacros(mealTotals.reduce(addMacros, ZERO));

  return (
    <div className="public-plan">
      <header className="public-plan-head">
        <div>
          <p className="public-plan-eyebrow">Plano alimentar</p>
          <h1>{plan.title}</h1>
          <p className="public-plan-sub">
            {p.name} · atualizado em {formatDate(plan.createdAt)}
          </p>
        </div>
        <PrintButton />
      </header>

      {dia.kcal > 0 && (
        <div className="public-plan-total">
          <div className="nutri-big">
            <strong>{dia.kcal}</strong>
            <span>kcal por dia</span>
          </div>
          <div className="nutri-macros">
            <div>
              <b>{dia.protein} g</b>
              <span>Proteína</span>
            </div>
            <div>
              <b>{dia.carb} g</b>
              <span>Carboidrato</span>
            </div>
            <div>
              <b>{dia.fat} g</b>
              <span>Gordura</span>
            </div>
          </div>
        </div>
      )}

      {meals.length === 0 && (
        <p className="empty">Este plano ainda está sendo montado.</p>
      )}

      {meals.map((meal, i) => {
        const total = roundMacros(mealTotals[i]);
        return (
          <section className="panel meal" key={i}>
            <div className="meal-header">
              <div className="meal-title">
                <span className="meal-emoji">{mealIcon(meal.name)}</span>
                <div>
                  <h2>{meal.name}</h2>
                  <div className="meal-sub">
                    {meal.time && <span className="meal-time">{meal.time}</span>}
                    {total.kcal > 0 && <span className="meal-kcal">{total.kcal} kcal</span>}
                  </div>
                </div>
              </div>
            </div>

            <ul className="meal-items">
              {meal.items.map((item, j) => (
                <li key={j} className="meal-item">
                  <div className="meal-item-main">
                    <span className="food-emoji">{foodIcon(item.text)}</span>
                    <span className="food-text">{item.text}</span>
                  </div>

                  {/* As substituições são o que o paciente mais usa: evitam a
                      pergunta "posso trocar?" no meio da semana. */}
                  {item.subs && item.subs.length > 0 && (
                    <ul className="subs">
                      {item.subs.map((s, k) => (
                        <li key={k}>
                          <span className="subs-label">ou</span>
                          <span className="food-emoji small">{foodIcon(s.text)}</span>
                          <span className="food-text">{s.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <footer className="public-plan-foot">
        <p>
          <strong>{nutri.clinic || nutri.name}</strong>
          {nutri.clinic ? ` · ${nutri.name}` : ""}
          {nutri.crn ? ` · ${nutri.crn}` : ""}
        </p>
        {nutri.phone && <p>{nutri.phone}</p>}
        <p className="public-plan-aviso">
          Prescrição individual, feita para você. Não compartilhe nem siga o plano de
          outra pessoa. Em caso de dúvida, fale com {nutri.name.split(" ")[0]}.
        </p>
      </footer>
    </div>
  );
}
