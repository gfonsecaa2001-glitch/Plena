import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { parseMeals } from "@/lib/mealplan";

export const dynamic = "force-dynamic";

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
        <div>
          <h1>Planos alimentares</h1>
          <p>Os planos são criados pela página de cada paciente.</p>
        </div>
      </div>

      <div className="panel">
        {plans.length === 0 ? (
          <p className="empty">
            Nenhum plano ainda. Abra um paciente em <Link href="/pacientes">Pacientes</Link> e crie
            o primeiro.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plano</th>
                <th>Paciente</th>
                <th>Refeições</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <Link href={`/planos/${plan.id}`}>
                      <strong>{plan.title}</strong>
                    </Link>
                  </td>
                  <td>
                    <Link href={`/pacientes/${plan.patientId}`}>{plan.patient.name}</Link>
                  </td>
                  <td>{parseMeals(plan.content).length}</td>
                  <td>{plan.createdAt.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
