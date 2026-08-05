import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { parseMeals } from "@/lib/mealplan";
import { formatDate } from "@/lib/datetime";
import { foodIcon, mealIcon } from "@/lib/food-icons";
import { Icon } from "@/lib/icons";
import { ZERO, addMacros, macrosFor, roundMacros, macroSplit, type Macros } from "@/lib/nutrition";
import {
  addMeal,
  removeMeal,
  removeMealItem,
  deleteMealPlan,
  addMealItem,
  addSubstitution,
  removeSubstitution,
} from "@/app/actions";
import { planoPronto, whatsappLink } from "@/lib/whatsapp";
import { isShareActive, shareUrl, siteUrl } from "@/lib/share";
import { WaButton } from "@/app/wa-button";
import { PrintButton } from "./print-button";
import { SharePanel } from "./share-panel";
import { FoodPicker } from "./food-picker";
import { SubPicker } from "./sub-picker";

export const dynamic = "force-dynamic";

function Bar({ done, target, label }: { done: number; target: number | null; label: string }) {
  if (!target) return null;
  const pct = Math.min(Math.round((done / target) * 100), 150);
  // Verde entre 90% e 110% da meta; fora disso, âmbar.
  const onTarget = pct >= 90 && pct <= 110;
  return (
    <div className="target-bar">
      <div className="target-bar-head">
        <span>{label}</span>
        <span>
          <strong>{Math.round(done)}</strong> / {Math.round(target)} · {pct}%
        </span>
      </div>
      <div className="target-track">
        <div
          className={`target-fill${onTarget ? " on" : ""}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default async function MealPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const nutritionist = await getCurrentNutritionist();

  const plan = await prisma.mealPlan.findFirst({
    where: { id, patient: { nutritionistId: nutritionist.id } },
    include: { patient: true },
  });

  if (!plan) notFound();

  const meals = parseMeals(plan.content);

  // Carrega de uma vez só os alimentos citados no plano, para calcular macros.
  const foodIds = [...new Set(meals.flatMap((m) => m.items.map((i) => i.foodId).filter(Boolean)))] as string[];
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
  const dayTotal = mealTotals.reduce(addMacros, ZERO);
  const dayRounded = roundMacros(dayTotal);
  const split = macroSplit(dayTotal);

  const totalItems = meals.reduce((sum, m) => sum + m.items.length, 0);
  const semCalculo = meals
    .flatMap((m) => m.items)
    .filter((i) => !i.foodId || !i.grams).length;

  const p = plan.patient;
  const temMeta = Boolean(p.kcalTarget || p.proteinTarget || p.carbTarget || p.fatTarget);

  // Link do paciente: só existe se estiver gerado E dentro do prazo.
  const linkAtivo = isShareActive(plan.shareToken, plan.shareExpiresAt, new Date());
  const link = linkAtivo ? shareUrl(plan.shareToken!, siteUrl()) : null;
  const mensagemPlano = planoPronto(p.name, nutritionist.name, plan.title, link);

  return (
    <>
      {/* Cabeçalho que só aparece no papel: o plano impresso é um documento
          clínico, e precisa dizer quem prescreveu e para quem. */}
      <div className="print-only print-brand">
        <h1>{nutritionist.clinic || nutritionist.name}</h1>
        <p className="print-crn">
          {nutritionist.clinic ? `${nutritionist.name} · ` : ""}
          {nutritionist.crn ?? "Nutricionista"}
        </p>
        {(nutritionist.phone || nutritionist.city) && (
          <p className="print-contact">
            {[nutritionist.phone, nutritionist.city].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="print-for">
          <span>
            <strong>{p.name}</strong> — {plan.title}
          </span>
          <span>{formatDate(plan.createdAt)}</span>
        </div>
      </div>

      {/* No papel quem identifica o documento é o cabeçalho de marca acima;
          este aqui é a navegação da tela e sairia duplicado. */}
      <div className="page-header no-print">
        <div className="title-with-icon">
          <span className="page-emoji">🍽️</span>
          <div>
            <h1>{plan.title}</h1>
            <p>
              <Link href={`/pacientes/${plan.patientId}`}>
                <strong>{p.name}</strong>
              </Link>{" "}
              · {meals.length} refeições · {totalItems} alimentos · criado em{" "}
              {formatDate(plan.createdAt)}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }} className="no-print">
          <WaButton phone={p.phone} message={mensagemPlano} />
          <PrintButton />
          <Link className="btn secondary no-print" href={`/pacientes/${plan.patientId}`}>
            <Icon name="back" size={15} /> Voltar
          </Link>
        </div>
      </div>

      {/* Resumo nutricional do dia */}
      {dayTotal.kcal > 0 && (
        <div className="panel nutri-summary">
          <h2 className="section-title">
            <Icon name="activity" size={17} /> Total do dia
          </h2>

          <div className="nutri-totals">
            <div className="nutri-big">
              <strong>{dayRounded.kcal}</strong>
              <span>kcal</span>
            </div>
            <div className="nutri-macros">
              <div>
                <b>{dayRounded.protein} g</b>
                <span>Proteína · {split.protein}%</span>
              </div>
              <div>
                <b>{dayRounded.carb} g</b>
                <span>Carboidrato · {split.carb}%</span>
              </div>
              <div>
                <b>{dayRounded.fat} g</b>
                <span>Gordura · {split.fat}%</span>
              </div>
            </div>
          </div>

          {temMeta ? (
            <div className="targets">
              <Bar done={dayTotal.kcal} target={p.kcalTarget} label="Calorias (kcal)" />
              <Bar done={dayTotal.protein} target={p.proteinTarget} label="Proteína (g)" />
              <Bar done={dayTotal.carb} target={p.carbTarget} label="Carboidrato (g)" />
              <Bar done={dayTotal.fat} target={p.fatTarget} label="Gordura (g)" />
            </div>
          ) : (
            <p className="muted no-print" style={{ fontSize: 13.5, margin: "14px 0 0" }}>
              Defina as metas na{" "}
              <Link href={`/pacientes/${plan.patientId}`}>página do paciente</Link> para
              acompanhar o progresso em relação ao alvo.
            </p>
          )}

          {semCalculo > 0 && (
            <p className="calc-warning no-print">
              <Icon name="alert" size={14} /> {semCalculo}{" "}
              {semCalculo === 1 ? "item escrito à mão não entra" : "itens escritos à mão não entram"}{" "}
              no cálculo. Escolha o alimento na tabela para incluir.
            </p>
          )}
        </div>
      )}

      {meals.length === 0 && (
        <div className="panel empty-state no-print">
          <span className="empty-emoji">🥣</span>
          <h2>Plano vazio</h2>
          <p className="muted">
            Adicione a primeira refeição abaixo — ex.: &quot;Café da manhã&quot;.
          </p>
        </div>
      )}

      {meals.map((meal, mealIndex) => {
        const total = roundMacros(mealTotals[mealIndex]);
        return (
          <div className="panel meal" key={mealIndex}>
            <div className="meal-header">
              <div className="meal-title">
                <span className="meal-emoji">{mealIcon(meal.name)}</span>
                <div>
                  <h2>{meal.name}</h2>
                  <div className="meal-sub">
                    {meal.time && (
                      <span className="meal-time">
                        <Icon name="clock" size={13} /> {meal.time}
                      </span>
                    )}
                    {total.kcal > 0 && (
                      <span className="meal-kcal">
                        {total.kcal} kcal · P {total.protein} · C {total.carb} · G {total.fat}
                      </span>
                    )}
                  </div>
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
                {meal.items.map((item, itemIndex) => {
                  const m = macrosOf(item);
                  const r = m ? roundMacros(m) : null;
                  return (
                    <li key={itemIndex} className="meal-item">
                      <div className="meal-item-main">
                        <span className="food-emoji">{foodIcon(item.text)}</span>
                        <span className="food-text">{item.text}</span>
                        {r ? (
                          <span className="food-macros">
                            <b>{r.kcal} kcal</b>
                            <span>
                              P {r.protein} · C {r.carb} · G {r.fat}
                            </span>
                          </span>
                        ) : (
                          <span className="food-macros muted no-print">sem cálculo</span>
                        )}
                        <form action={removeMealItem} className="no-print">
                          <input type="hidden" name="planId" value={plan.id} />
                          <input type="hidden" name="mealIndex" value={mealIndex} />
                          <input type="hidden" name="itemIndex" value={itemIndex} />
                          <button className="link-remove" type="submit" aria-label="Remover item">
                            ×
                          </button>
                        </form>
                      </div>

                      {/* Substituições: o paciente leva impresso o que pode
                          comer no lugar, sem precisar perguntar. */}
                      {item.subs && item.subs.length > 0 && (
                        <ul className="subs">
                          {item.subs.map((s, subIndex) => (
                            <li key={subIndex}>
                              <span className="subs-label">ou</span>
                              <span className="food-emoji small">{foodIcon(s.text)}</span>
                              <span className="food-text">{s.text}</span>
                              <form action={removeSubstitution} className="no-print">
                                <input type="hidden" name="planId" value={plan.id} />
                                <input type="hidden" name="mealIndex" value={mealIndex} />
                                <input type="hidden" name="itemIndex" value={itemIndex} />
                                <input type="hidden" name="subIndex" value={subIndex} />
                                <button
                                  className="link-remove"
                                  type="submit"
                                  aria-label="Remover substituição"
                                >
                                  ×
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Só faz sentido oferecer troca de item calculado */}
                      {r && (
                        <SubPicker
                          planId={plan.id}
                          mealIndex={mealIndex}
                          itemIndex={itemIndex}
                          kcalAlvo={r.kcal}
                          action={addSubstitution}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <FoodPicker planId={plan.id} mealIndex={mealIndex} action={addMealItem} />
          </div>
        );
      })}

      <SharePanel
        planId={plan.id}
        url={link}
        expiraEm={plan.shareExpiresAt ? formatDate(plan.shareExpiresAt) : null}
        whatsappHref={whatsappLink(p.phone, mensagemPlano)}
      />

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

      <div className="print-only print-footer">
        Plano elaborado por {nutritionist.name}
        {nutritionist.crn ? ` — ${nutritionist.crn}` : ""}. Prescrição individual: não
        compartilhe nem reutilize para outra pessoa.
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
