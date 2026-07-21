import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { parseMeals } from "@/lib/mealplan";
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{plan.title}</h1>
          <p>
            Paciente:{" "}
            <Link href={`/pacientes/${plan.patientId}`}>
              <strong>{plan.patient.name}</strong>
            </Link>{" "}
            · criado em {plan.createdAt.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <PrintButton />
          <Link className="btn secondary no-print" href={`/pacientes/${plan.patientId}`}>
            ← Voltar
          </Link>
        </div>
      </div>

      {meals.length === 0 && (
        <p className="empty no-print">
          Plano vazio. Adicione a primeira refeição abaixo — ex.: "Café da manhã".
        </p>
      )}

      {meals.map((meal, mealIndex) => (
        <div className="panel meal" key={mealIndex}>
          <div className="meal-header">
            <h2>
              {meal.name}
              {meal.time && <span className="muted"> · {meal.time}</span>}
            </h2>
            <form action={removeMeal} className="no-print">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="mealIndex" value={mealIndex} />
              <button className="btn small secondary" type="submit">
                Remover refeição
              </button>
            </form>
          </div>

          {meal.items.length === 0 ? (
            <p className="empty">Nenhum alimento ainda.</p>
          ) : (
            <ul className="meal-items">
              {meal.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <span>{item}</span>
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

          <form action={addMealItem} className="inline-form no-print" style={{ marginTop: 10 }}>
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="mealIndex" value={mealIndex} />
            <div className="field" style={{ flex: 1 }}>
              <input name="item" placeholder="Ex.: 2 ovos mexidos · 100g de arroz integral…" />
            </div>
            <button className="btn small" type="submit">
              + Alimento
            </button>
          </form>
        </div>
      ))}

      <div className="panel no-print">
        <h2>Nova refeição</h2>
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
          Excluir este plano
        </button>
      </form>
    </>
  );
}
