import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { createFood, deleteFood } from "@/app/actions";
import { foodIcon } from "@/lib/food-icons";
import { Icon } from "@/lib/icons";
import { RecipeBuilder } from "./recipe-builder";

export const dynamic = "force-dynamic";

export default async function FoodsPage() {
  const nutritionist = await getCurrentNutritionist();

  const [meus, totalTaco] = await Promise.all([
    prisma.food.findMany({
      where: { nutritionistId: nutritionist.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.food.count({ where: { nutritionistId: null } }),
  ]);

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">🥣</span>
          <div>
            <h1>Meus alimentos</h1>
            <p>
              Receitas e produtos que você usa e não estão na tabela oficial ·{" "}
              {totalTaco} alimentos da TACO já disponíveis
            </p>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 className="section-title">
          <Icon name="plus" size={17} /> Novo alimento
        </h2>
        <RecipeBuilder action={createFood} />
      </div>

      <div className="panel">
        <h2 className="section-title">
          <Icon name="meal" size={17} /> Cadastrados por você
        </h2>

        {meus.length === 0 ? (
          <div className="empty-inline">
            <span className="empty-emoji small">🍳</span>
            <p className="muted">
              Nenhum ainda. Monte uma receita acima e ela passa a aparecer na busca dos planos
              alimentares.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Alimento</th>
                <th>Categoria</th>
                <th>Por 100 g</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {meus.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="row-name">
                      <span className="food-emoji">{foodIcon(f.name)}</span>
                      <strong>{f.name}</strong>
                    </div>
                  </td>
                  <td>{f.category}</td>
                  <td>
                    <span className="food-macros">
                      <b>{Math.round(f.kcal)} kcal</b>
                      <span>
                        P {f.proteinG} · C {f.carbG} · G {f.fatG}
                      </span>
                    </span>
                  </td>
                  <td>
                    <form action={deleteFood}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className="btn small secondary danger" type="submit">
                        <Icon name="trash" size={13} /> Excluir
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="calc-note">
        Seus alimentos são <strong>só seus</strong> — nenhum outro nutricionista os vê. Eles
        aparecem junto com os da TACO quando você busca um alimento no plano.
      </p>
    </>
  );
}
