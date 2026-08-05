import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionistOrNull } from "@/lib/tenant";
import { parseMeals } from "@/lib/mealplan";

// Exportação dos dados de um paciente (LGPD, art. 18, V — portabilidade).
//
// O paciente tem direito de pedir tudo o que existe sobre ele, em formato
// legível por máquina. Devolvemos um JSON com o registro inteiro, e não um
// resumo: a lei fala em dados, não em relatório.
//
// É uma rota de API, e não uma server action, porque o resultado é um ARQUIVO
// para baixar — server action devolve dados para a página, não um download.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const nutritionist = await getCurrentNutritionistOrNull();
  if (!nutritionist) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  // O mesmo isolamento das páginas: paciente de outra conta não existe aqui.
  const patient = await prisma.patient.findFirst({
    where: { id, nutritionistId: nutritionist.id },
    include: {
      measurements: { orderBy: { date: "asc" } },
      appointments: { orderBy: { scheduledAt: "asc" } },
      mealPlans: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "asc" } },
      charges: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!patient) {
    return NextResponse.json({ erro: "paciente não encontrado" }, { status: 404 });
  }

  const dados = {
    exportadoEm: new Date().toISOString(),
    origem: "Plena — CRM para nutricionistas",
    responsavel: { nome: nutritionist.name, crn: nutritionist.crn ?? null },
    paciente: {
      nome: patient.name,
      email: patient.email,
      telefone: patient.phone,
      dataNascimento: patient.birthDate,
      sexo: patient.sex,
      objetivo: patient.goal,
      situacao: patient.status,
      anamnese: {
        restricoes: patient.restrictions,
        condicoesDeSaude: patient.conditions,
        medicamentos: patient.medications,
        habitoIntestinal: patient.bowelHabit,
        sonoHorasPorNoite: patient.sleepHours,
        aguaLitrosPorDia: patient.waterLiters,
        historicoFamiliar: patient.familyHistory,
        observacoes: patient.anamnesis,
      },
      cadastradoEm: patient.createdAt,
      metas: {
        nivelAtividade: patient.activityLevel,
        kcal: patient.kcalTarget,
        proteinaG: patient.proteinTarget,
        carboidratoG: patient.carbTarget,
        gorduraG: patient.fatTarget,
      },
    },
    avaliacoes: patient.measurements.map((m) => ({
      data: m.date,
      pesoKg: m.weightKg,
      alturaCm: m.heightCm,
      gorduraPct: m.bodyFatPct,
      cinturaCm: m.waistCm,
      quadrilCm: m.hipCm,
      dobrasMm: {
        triceps: m.tricepsMm,
        subescapular: m.subscapularMm,
        suprailiaca: m.suprailiacMm,
        abdominal: m.abdominalMm,
        coxa: m.thighMm,
        peitoral: m.chestMm,
        axilarMedia: m.midaxillaryMm,
        protocolo: m.skinfoldProtocol,
      },
      observacoes: m.notes,
    })),
    consultas: patient.appointments.map((a) => ({
      quando: a.scheduledAt,
      situacao: a.status,
      observacoes: a.notes,
      origem: a.source,
    })),
    // O plano é guardado como JSON; devolvemos já estruturado, para o arquivo
    // ser realmente legível e não trazer um texto escapado dentro do texto.
    planosAlimentares: patient.mealPlans.map((p) => ({
      titulo: p.title,
      criadoEm: p.createdAt,
      refeicoes: parseMeals(p.content),
    })),
    registrosClinicos: patient.notes.map((n) => ({
      tipo: n.kind,
      conteudo: n.content,
      criadoEm: n.createdAt,
    })),
    financeiro: patient.charges.map((c) => ({
      descricao: c.description,
      valorReais: c.amountCents / 100,
      situacao: c.status,
      vencimento: c.dueDate,
      pagoEm: c.paidAt,
      forma: c.method,
    })),
  };

  const arquivo = `plena-${patient.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;

  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      // Dado de saúde não pode ficar em cache de proxy nem do navegador.
      "Cache-Control": "no-store",
    },
  });
}
