import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Isolamento entre contas: um nutricionista NUNCA pode enxergar ou alterar
// dados de outro. É a garantia mais importante do sistema.
//
// Estes testes escrevem e apagam dados, então precisam de um banco SÓ DELES.
// Sem a variável TEST_DATABASE_URL eles são pulados — rodar contra o banco de
// produção apagaria dados de nutricionistas reais.
//
// Como habilitar:
//   1. No console do Neon, crie um branch do banco (botão "Branches" → "New")
//   2. Copie a connection string desse branch
//   3. TEST_DATABASE_URL="postgresql://..." npm test
//   4. Na primeira vez: DATABASE_URL=$TEST_DATABASE_URL npx prisma db push

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("isolamento entre contas", () => {
  // Criado dentro do beforeAll: no topo do arquivo ele seria construído mesmo
  // com a suíte pulada, e quebraria por falta de URL.
  let prisma: PrismaClient;
  let nutriA: string;
  let nutriB: string;
  let pacienteDeA: string;
  let planoDeA: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } });

    const a = await prisma.nutritionist.create({
      data: { name: "Teste A", email: `teste-a-${Date.now()}@exemplo.test` },
    });
    const b = await prisma.nutritionist.create({
      data: { name: "Teste B", email: `teste-b-${Date.now()}@exemplo.test` },
    });
    nutriA = a.id;
    nutriB = b.id;

    const p = await prisma.patient.create({
      data: { nutritionistId: nutriA, name: "Paciente de A" },
    });
    pacienteDeA = p.id;

    const plano = await prisma.mealPlan.create({
      data: { patientId: pacienteDeA, title: "Plano de A" },
    });
    planoDeA = plano.id;
  });

  afterAll(async () => {
    for (const id of [nutriA, nutriB]) {
      const ps = await prisma.patient.findMany({ where: { nutritionistId: id } });
      for (const p of ps) {
        await prisma.note.deleteMany({ where: { patientId: p.id } });
        await prisma.measurement.deleteMany({ where: { patientId: p.id } });
        await prisma.mealPlan.deleteMany({ where: { patientId: p.id } });
      }
      await prisma.appointment.deleteMany({ where: { nutritionistId: id } });
      await prisma.patient.deleteMany({ where: { nutritionistId: id } });
      await prisma.nutritionist.delete({ where: { id } });
    }
    await prisma.$disconnect();
  });

  it("B não encontra o paciente de A, mesmo sabendo o id", () => {
    return expect(
      prisma.patient.findFirst({ where: { id: pacienteDeA, nutritionistId: nutriB } })
    ).resolves.toBeNull();
  });

  it("A encontra o próprio paciente", () => {
    return expect(
      prisma.patient.findFirst({ where: { id: pacienteDeA, nutritionistId: nutriA } })
    ).resolves.not.toBeNull();
  });

  it("B não encontra o plano alimentar de A", () => {
    return expect(
      prisma.mealPlan.findFirst({
        where: { id: planoDeA, patient: { nutritionistId: nutriB } },
      })
    ).resolves.toBeNull();
  });

  it("a listagem de B não traz nenhum paciente de A", async () => {
    const lista = await prisma.patient.findMany({ where: { nutritionistId: nutriB } });
    expect(lista.map((p) => p.id)).not.toContain(pacienteDeA);
  });

  it("os alimentos da TACO são compartilhados; os próprios, não", async () => {
    const meu = await prisma.food.create({
      data: {
        name: "Receita de A",
        category: "Miscelâneas",
        kcal: 100,
        proteinG: 5,
        carbG: 10,
        fatG: 2,
        nutritionistId: nutriA,
      },
    });

    // O seletor busca os públicos (nutritionistId nulo) + os do próprio dono.
    const visiveisParaB = await prisma.food.findMany({
      where: {
        id: meu.id,
        OR: [{ nutritionistId: null }, { nutritionistId: nutriB }],
      },
    });
    expect(visiveisParaB).toHaveLength(0);

    const visiveisParaA = await prisma.food.findMany({
      where: {
        id: meu.id,
        OR: [{ nutritionistId: null }, { nutritionistId: nutriA }],
      },
    });
    expect(visiveisParaA).toHaveLength(1);

    await prisma.food.delete({ where: { id: meu.id } });
  });
});
