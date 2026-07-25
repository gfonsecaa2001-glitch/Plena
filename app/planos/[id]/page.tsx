import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { parseMeals } from "@/lib/mealplan";
import { formatDate } from "@/lib/datetime";
import { foodIcon, mealIcon } from "@/lib/food-icons";
import { Icon } from "@/lib/icons";
import { addMeal, addMealItem, removeMeal, removeMealItem, deleteMealPlan } from "@/app/actions";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function MealPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const nutritionist = await getCurrentNutritionist();

  const plan = await prisma.mealPlan.findFirst({
    where: { id, patient: { nutritionistId: nutritionist.id } },
    include: { patient: true },
  });

  if (!plan) notFound();

  const meals = parseMeals(plan.content);
  const totalItems = meals.reduce((sum, m) => sum + m.items.length, 0);

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">🍽️</span>
          <div>
            <h1>{plan.title}</h1>
            <p>
              <Link href={`/pacientes/${plan.patientId}`}>
                <strong>{plan.patient.name}</strong>
              </Link>{" "}
              · {meals.length} refeições · {totalItems} alimentos · criado em{" "}
              {formatDate(plan.createdAt)}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <PrintButton />
          <Link className="btn secondary no-print" href={`/pacientes/${plan.patientId}`}>
            <Icon name="back" size={15} /> Voltar
          </Link>
        </div>
      </div>

      {meals.length === 0 && (
        <div className="panel empty-state no-print">
          <span className="empty-emoji">🥣</span>
          <h2>Plano vazio</h2>
          <p className="muted">
            Adicione a primeira refeição abaixo — ex.: &quot;Café da manhã&quot;.
          </p>
        </div>
      )}

      {meals.map((meal, mealIndex) => (
        <div className="panel meal" key={mealIndex}>
          <div className="meal-header">
            <div className="meal-title">
              <span className="meal-emoji">{mealIcon(meal.name)}</span>
              <div>
                <h2>{meal.name}</h2>
                {meal.time && (
                  <span className="meal-time">
                    <Icon name="clock" size={13} /> {meal.time}
                  </span>
                )}
              </div>
            </div>
            <form action={removeMeal} className="no-print">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="mealIndex" value={mealIndex} />
              <button className="btn small secondary danger" type="submit">
                <Icon name="trash" size={14} /> Remover
              </button>
            </form>
          </div>

          {meal.items.length === 0 ? (
            <p className="empty">Nenhum alimento ainda.</p>
          ) : (
            <ul className="meal-items">
              {meal.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <span className="food-emoji">{foodIcon(item)}</span>
                  <span className="food-text">{item}</span>
                  <form action={removeMealItem} className="no-print">
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="mealIndex" value={mealIndex} />
                    <input type="hidden" name="itemIndex" value={itemIndex} />
                    <button className="link-remove" type="submit" aria-label="Remover item">
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={addMealItem} className="inline-form no-print" style={{ marginTop: 12 }}>
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="mealIndex" value={mealIndex} />
            <div className="field" style={{ flex: 1 }}>
              <input name="item" placeholder="Ex.: 2 ovos mexidos · 100g de arroz integral…" />
            </div>
            <button className="btn small" type="submit">
              <Icon name="plus" size={14} /> Alimento
            </button>
          </form>
        </div>
      ))}

      <div className="panel no-print">
        <h2 className="section-title">
          <Icon name="plus" size={17} /> Nova refeição
        </h2>
        <form action={addMeal} className="inline-form">
          <input type="hidden" name="planId" value={plan.id} />
          <div className="field" style={{ flex: 1 }}>
            <label>Nome</label>
            <input name="name" placeholder="Café da manhã, Almoço, Lanche…" required />
          </div>
          <div className="field">
            <label>Horário</label>
            <input name="time" type="time" />
          </div>
          <button className="btn small" type="submit">
            Adicionar
          </button>
        </form>
      </div>

      <form action={deleteMealPlan} className="no-print" style={{ marginTop: 8 }}>
        <input type="hidden" name="planId" value={plan.id} />
        <button className="btn small secondary danger" type="submit">
          <Icon name="trash" size={14} /> Excluir este plano
        </button>
      </form>
    </>
  );
}
