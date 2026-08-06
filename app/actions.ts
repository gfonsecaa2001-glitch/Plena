"use server";

// Server Actions: funções que rodam no servidor e podem ser chamadas
// diretamente de um <form>. É o jeito mais simples de gravar dados no Next.js —
// sem precisar criar rotas de API à parte.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { parseMeals, serializeMeals } from "@/lib/mealplan";
import { parseDateInput, parseDateTimeInput, todayISO, dayRange } from "@/lib/datetime";
import {
  bodyFatFromSkinfolds,
  idadeEm,
  PROTOCOLOS,
  type Protocolo,
} from "@/lib/skinfold";
import { pushEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";
import { slugify } from "@/lib/booking";
import { parseMoneyToCents } from "@/lib/money";
import { generateShareToken, defaultExpiry } from "@/lib/share";
import { lerPlanilha, chavesDuplicidade, jaVisto } from "@/lib/csv";

function optional(value: FormDataEntryValue | null, max = 5000): string | null {
  const s = value?.toString().trim().slice(0, max);
  return s ? s : null;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const s = optional(value);
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Segurança multi-tenant: toda ação que recebe um ID vindo do formulário
// PRECISA conferir se aquele dado pertence ao nutricionista logado — um
// usuário malicioso pode enviar qualquer ID que quiser no formulário.
async function requireOwnPatient(patientId: string) {
  const nutritionist = await getCurrentNutritionist();
  return prisma.patient.findFirst({
    where: { id: patientId, nutritionistId: nutritionist.id },
  });
}

async function requireOwnPlan(planId: string) {
  const nutritionist = await getCurrentNutritionist();
  return prisma.mealPlan.findFirst({
    where: { id: planId, patient: { nutritionistId: nutritionist.id } },
  });
}

export async function createPatient(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  const birthDate = optional(formData.get("birthDate"));
  const patient = await prisma.patient.create({
    data: {
      nutritionistId: nutritionist.id,
      name,
      email: optional(formData.get("email")),
      phone: optional(formData.get("phone")),
      sex: optional(formData.get("sex")),
      goal: optional(formData.get("goal")),
      anamnesis: optional(formData.get("anamnesis")),
      birthDate: birthDate ? parseDateInput(birthDate) : null,
    },
  });

  redirect(`/pacientes/${patient.id}`);
}

// Importa pacientes de uma planilha.
//
// O servidor recebe o TEXTO ORIGINAL e refaz a leitura com a mesma função que
// gerou a prévia — nunca a lista já processada pelo navegador. Assim o que foi
// aprovado na tela é exatamente o que entra no banco, e um formulário forjado
// não injeta pacientes com campos arbitrários.
export async function importPatients(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const texto = formData.get("planilha")?.toString() ?? "";
  if (!texto.trim()) return;

  const { pacientes } = lerPlanilha(texto);
  if (pacientes.length === 0) return;

  // Teto por importação: protege contra colar um arquivo gigante por engano.
  const lote = pacientes.slice(0, 500);

  // Quem já está cadastrado nesta conta não entra de novo. A comparação usa
  // nome + telefone + e-mail porque homônimo existe, e cadastrar a pessoa
  // duas vezes espalha o histórico dela em duas fichas.
  const existentes = await prisma.patient.findMany({
    where: { nutritionistId: nutritionist.id },
    select: { name: true, phone: true, email: true },
  });
  const vistos = new Set<string>();
  for (const p of existentes) {
    jaVisto(vistos, chavesDuplicidade(p.name, p.phone, p.email));
  }

  const novos = [];
  for (const p of lote) {
    if (jaVisto(vistos, chavesDuplicidade(p.name, p.phone, p.email))) continue;
    novos.push({
      nutritionistId: nutritionist.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      birthDate: p.birthDate,
      sex: p.sex,
      goal: p.goal,
      restrictions: p.restrictions,
      anamnesis: p.anamnesis,
    });
  }

  if (novos.length > 0) {
    await prisma.patient.createMany({ data: novos });
  }

  revalidatePath("/pacientes");
  revalidatePath("/");
  redirect(`/pacientes?importados=${novos.length}&repetidos=${lote.length - novos.length}`);
}

export async function addMeasurement(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  if (!(await requireOwnPatient(patientId))) return;
  const date = optional(formData.get("date"));

  await prisma.measurement.create({
    data: {
      patientId,
      date: date ? parseDateInput(date) : new Date(),
      weightKg: optionalNumber(formData.get("weightKg")),
      heightCm: optionalNumber(formData.get("heightCm")),
      bodyFatPct: optionalNumber(formData.get("bodyFatPct")),
      waistCm: optionalNumber(formData.get("waistCm")),
      hipCm: optionalNumber(formData.get("hipCm")),
      notes: optional(formData.get("notes")),
    },
  });

  revalidatePath(`/pacientes/${patientId}`);
}

// Dobras cutâneas: grava as medidas e o % de gordura que elas produzem.
//
// O cálculo é refeito NO SERVIDOR, mesmo o formulário já mostrando a prévia na
// tela. O que vem do navegador é digitável por qualquer um — e este número vai
// para um prontuário.
export async function addSkinfold(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  const patient = await requireOwnPatient(patientId);
  if (!patient) return;

  const dataTexto = optional(formData.get("date")) ?? todayISO();
  const data = parseDateInput(dataTexto);

  const dobras = {
    tricepsMm: optionalNumber(formData.get("tricepsMm")),
    subscapularMm: optionalNumber(formData.get("subscapularMm")),
    suprailiacMm: optionalNumber(formData.get("suprailiacMm")),
    abdominalMm: optionalNumber(formData.get("abdominalMm")),
    thighMm: optionalNumber(formData.get("thighMm")),
    chestMm: optionalNumber(formData.get("chestMm")),
    midaxillaryMm: optionalNumber(formData.get("midaxillaryMm")),
  };

  const protocoloTexto = formData.get("protocolo")?.toString() ?? "";
  if (!PROTOCOLOS.some((p) => p.id === protocoloTexto)) return;
  const protocolo = protocoloTexto as Protocolo;

  const pct = bodyFatFromSkinfolds(
    protocolo,
    dobras,
    patient.sex,
    idadeEm(patient.birthDate, data)
  );
  if (pct === null) return; // faltou dobra ou o resultado não é plausível

  const peso = optionalNumber(formData.get("weightKg"));

  // Uma avaliação por dia: se já existe uma medição nessa data, as dobras
  // entram nela em vez de criar uma linha duplicada no histórico.
  const { start, end } = dayRange(dataTexto);
  const existente = await prisma.measurement.findFirst({
    where: { patientId, date: { gte: start, lt: end } },
  });

  const dados = {
    ...dobras,
    skinfoldProtocol: protocolo,
    bodyFatPct: pct,
    ...(peso && peso > 0 ? { weightKg: peso } : {}),
  };

  if (existente) {
    await prisma.measurement.update({ where: { id: existente.id }, data: dados });
  } else {
    await prisma.measurement.create({ data: { patientId, date: data, ...dados } });
  }

  revalidatePath(`/pacientes/${patientId}`);
}

export async function addAppointment(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const patientId = formData.get("patientId")!.toString();
  const patient = await requireOwnPatient(patientId);
  if (!patient) return;
  const scheduledAt = optional(formData.get("scheduledAt"));
  if (!scheduledAt) return;

  const start = parseDateTimeInput(scheduledAt);
  const notes = optional(formData.get("notes"));

  const appointment = await prisma.appointment.create({
    data: { nutritionistId: nutritionist.id, patientId, scheduledAt: start, notes },
  });

  // Espelha no Google Agenda (se conectado). Nunca quebra o fluxo se falhar.
  await pushEvent(nutritionist.id, appointment.id, patient.name, start, notes);

  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function setAppointmentStatus(formData: FormData) {
  const id = formData.get("id")!.toString();
  const status = formData.get("status")!.toString();

  const nutritionist = await getCurrentNutritionist();
  const owned = await prisma.appointment.findFirst({
    where: { id, nutritionistId: nutritionist.id },
    include: { patient: { select: { name: true } } },
  });
  if (!owned) return;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status },
  });

  if (owned.googleEventId) {
    await updateEvent(
      nutritionist.id,
      owned.googleEventId,
      owned.patient.name,
      owned.scheduledAt,
      owned.notes,
      status
    );
  }

  revalidatePath("/agenda");
  revalidatePath(`/pacientes/${appointment.patientId}`);
  revalidatePath("/");
}

export async function saveBookingSettings(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();

  const days = ["1", "2", "3", "4", "5", "6", "7"].filter((d) => formData.get(`day-${d}`));
  const start = Number(formData.get("start")) || 8;
  const end = Number(formData.get("end")) || 18;
  const slotMin = Number(formData.get("slotMin")) || 60;

  let slug = slugify(optional(formData.get("slug")) ?? nutritionist.name);
  if (!slug) slug = `nutri-${nutritionist.id.slice(-6)}`;

  // O endereço precisa ser único: se já existe em outra conta, acrescenta um sufixo.
  const taken = await prisma.nutritionist.findFirst({
    where: { bookingSlug: slug, id: { not: nutritionist.id } },
  });
  if (taken) slug = `${slug}-${nutritionist.id.slice(-4)}`;

  await prisma.nutritionist.update({
    where: { id: nutritionist.id },
    data: {
      bookingSlug: slug,
      bookingEnabled: Boolean(formData.get("enabled")),
      bookingDays: days.length ? days.join(",") : "1,2,3,4,5",
      bookingStart: Math.min(Math.max(start, 0), 23),
      bookingEnd: Math.min(Math.max(end, start + 1), 24),
      bookingSlotMin: [30, 45, 60, 90].includes(slotMin) ? slotMin : 60,
    },
  });

  revalidatePath("/agendamento");
}

export async function disconnectGoogle() {
  const nutritionist = await getCurrentNutritionist();

  await prisma.nutritionist.update({
    where: { id: nutritionist.id },
    data: {
      googleEmail: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
    },
  });

  revalidatePath("/integracoes");
}

// ---------- Planos alimentares ----------

// Helper: carrega o plano, aplica uma transformação na lista de refeições e salva.
async function updateMeals(
  planId: string,
  transform: (meals: ReturnType<typeof parseMeals>) => ReturnType<typeof parseMeals>
) {
  const plan = await requireOwnPlan(planId);
  if (!plan) return;
  const meals = transform(parseMeals(plan.content));
  await prisma.mealPlan.update({
    where: { id: planId },
    data: { content: serializeMeals(meals) },
  });
  revalidatePath(`/planos/${planId}`);
}

// Cria um plano do zero, a partir de um modelo, ou copiando outro plano do
// mesmo paciente. O conteúdo é sempre COPIADO — depois de criado, o plano vive
// a vida dele: mexer nele não altera o modelo, e mexer no modelo não altera os
// planos que já saíram dele.
export async function createMealPlan(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  if (!(await requireOwnPatient(patientId))) return;

  const origem = optional(formData.get("origem")); // "" | "modelo:ID" | "plano:ID"
  let content = "[]";
  let tituloPadrao = "Plano alimentar";

  if (origem?.startsWith("modelo:")) {
    const nutritionist = await getCurrentNutritionist();
    const modelo = await prisma.planTemplate.findFirst({
      where: { id: origem.slice(7), nutritionistId: nutritionist.id },
    });
    if (modelo) {
      content = modelo.content;
      tituloPadrao = modelo.title;
    }
  } else if (origem?.startsWith("plano:")) {
    // Só copia plano do MESMO paciente — o id vem do formulário.
    const anterior = await prisma.mealPlan.findFirst({
      where: { id: origem.slice(6), patientId },
    });
    if (anterior) {
      content = anterior.content;
      tituloPadrao = `${anterior.title} (cópia)`;
    }
  }

  const plan = await prisma.mealPlan.create({
    data: { patientId, title: optional(formData.get("title")) ?? tituloPadrao, content },
  });

  redirect(`/planos/${plan.id}`);
}

// ---------- Modelos de plano ----------

export async function savePlanAsTemplate(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const plan = await requireOwnPlan(planId);
  if (!plan) return;

  const nutritionist = await getCurrentNutritionist();
  await prisma.planTemplate.create({
    data: {
      nutritionistId: nutritionist.id,
      title: optional(formData.get("title"), 120) ?? plan.title,
      content: plan.content, // cópia: o modelo não acompanha edições do plano
    },
  });

  revalidatePath("/modelos");
  redirect("/modelos?salvo=1");
}

export async function renameTemplate(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const id = formData.get("id")!.toString();
  const title = optional(formData.get("title"), 120);
  if (!title) return;

  const meu = await prisma.planTemplate.findFirst({
    where: { id, nutritionistId: nutritionist.id },
  });
  if (!meu) return;

  await prisma.planTemplate.update({ where: { id }, data: { title } });
  revalidatePath("/modelos");
}

export async function deleteTemplate(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const id = formData.get("id")!.toString();

  const meu = await prisma.planTemplate.findFirst({
    where: { id, nutritionistId: nutritionist.id },
  });
  if (!meu) return;

  await prisma.planTemplate.delete({ where: { id } });
  revalidatePath("/modelos");
}

// Copia um plano para OUTRO paciente — o caso de dois pacientes com a mesma
// conduta, sem precisar virar modelo antes.
//
// O link de compartilhamento NÃO é copiado: cada plano tem o seu, e clonar o
// token daria ao paciente novo um endereço que já está no WhatsApp do antigo.
export async function copyPlanToPatient(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const plan = await requireOwnPlan(planId);
  if (!plan) return;

  const destinoId = formData.get("destinoId")?.toString() ?? "";
  const destino = await requireOwnPatient(destinoId);
  if (!destino) return;

  const novo = await prisma.mealPlan.create({
    data: { patientId: destino.id, title: plan.title, content: plan.content },
  });

  revalidatePath(`/pacientes/${destino.id}`);
  redirect(`/planos/${novo.id}`);
}

export async function addMeal(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const name = optional(formData.get("name"));
  if (!name) return;

  await updateMeals(planId, (meals) => [
    ...meals,
    { name, time: optional(formData.get("time")) ?? undefined, items: [] },
  ]);
}

export async function addMealItem(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const mealIndex = Number(formData.get("mealIndex"));
  const foodId = optional(formData.get("foodId"));
  const gramsRaw = optionalNumber(formData.get("grams"));
  let text = optional(formData.get("item"));

  // Caminho 1: escolheu um alimento da tabela → o texto é montado a partir
  // dele, e guardamos o vínculo para poder recalcular os macros depois.
  if (foodId) {
    // O id vem do formulário e não é confiável. Sem este filtro, um id forjado
    // traz a receita PRIVADA de outro nutricionista para dentro do plano —
    // com nome e macros. Mesma regra já aplicada em addSubstitution.
    const nutritionist = await getCurrentNutritionist();
    const food = await prisma.food.findFirst({
      where: { id: foodId, OR: [{ nutritionistId: null }, { nutritionistId: nutritionist.id }] },
    });
    if (!food) return;
    const grams = gramsRaw && gramsRaw > 0 ? Math.min(gramsRaw, 5000) : 100;
    await updateMeals(planId, (meals) => {
      meals[mealIndex]?.items.push({
        text: `${grams} g de ${food.name}`,
        foodId: food.id,
        grams,
      });
      return meals;
    });
    return;
  }

  // Caminho 2: texto livre (o nutricionista pode sempre escrever à mão).
  if (!text) return;
  await updateMeals(planId, (meals) => {
    meals[mealIndex]?.items.push({ text });
    return meals;
  });
}

// ---------- Financeiro ----------

export async function createCharge(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const patientId = formData.get("patientId")!.toString();
  if (!(await requireOwnPatient(patientId))) return;

  const amountCents = parseMoneyToCents(formData.get("amount")?.toString());
  if (!amountCents || amountCents <= 0) return;

  const dueDate = optional(formData.get("dueDate"));
  const jaPago = Boolean(formData.get("jaPago"));

  await prisma.charge.create({
    data: {
      nutritionistId: nutritionist.id,
      patientId,
      description: optional(formData.get("description"), 200) ?? "Consulta",
      amountCents,
      dueDate: dueDate ? parseDateInput(dueDate) : null,
      status: jaPago ? "pago" : "pendente",
      paidAt: jaPago ? new Date() : null,
      method: jaPago ? optional(formData.get("method"), 20) : null,
    },
  });

  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/");
}

export async function setChargeStatus(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const id = formData.get("id")!.toString();
  const status = formData.get("status")?.toString() ?? "";
  if (!["pendente", "pago", "cancelado"].includes(status)) return;

  const cobranca = await prisma.charge.findFirst({
    where: { id, nutritionistId: nutritionist.id },
  });
  if (!cobranca) return;

  await prisma.charge.update({
    where: { id },
    data: {
      status,
      // A data de recebimento acompanha o status: virou "pago" agora, a data
      // é agora; voltou para em aberto, a data é apagada.
      paidAt: status === "pago" ? (cobranca.paidAt ?? new Date()) : null,
      method: status === "pago" ? (optional(formData.get("method"), 20) ?? cobranca.method) : null,
    },
  });

  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${cobranca.patientId}`);
  revalidatePath("/");
}

export async function deleteCharge(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const id = formData.get("id")!.toString();

  const cobranca = await prisma.charge.findFirst({
    where: { id, nutritionistId: nutritionist.id },
  });
  if (!cobranca) return;

  await prisma.charge.delete({ where: { id } });
  revalidatePath("/financeiro");
  revalidatePath(`/pacientes/${cobranca.patientId}`);
}

export async function saveDefaultPrice(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const cents = parseMoneyToCents(formData.get("defaultPrice")?.toString());

  await prisma.nutritionist.update({
    where: { id: nutritionist.id },
    data: { defaultPriceCents: cents && cents > 0 ? cents : null },
  });

  revalidatePath("/financeiro");
}

// ---------- LGPD: direito à exclusão ----------

// Apaga o paciente e TUDO ligado a ele (LGPD, art. 18, VI).
//
// Duas travas propositais, porque isso não tem volta:
//   1. o nutricionista precisa digitar o nome do paciente igualzinho;
//   2. confirmamos que o paciente é dele antes de qualquer coisa.
//
// As demais tabelas somem junto por cascata (definida no schema); os eventos
// no Google Agenda são apagados na melhor das intenções — se o Google estiver
// fora do ar, a exclusão no Plena acontece do mesmo jeito, porque o direito do
// titular não pode depender de um serviço de terceiro.
export async function deletePatient(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  const patient = await requireOwnPatient(patientId);
  if (!patient) return;

  const confirmacao = formData.get("confirmacao")?.toString().trim() ?? "";
  if (confirmacao.toLowerCase() !== patient.name.trim().toLowerCase()) {
    redirect(`/pacientes/${patientId}?erro=confirmacao`);
  }

  const nutritionist = await getCurrentNutritionist();
  const comEvento = await prisma.appointment.findMany({
    where: { patientId, googleEventId: { not: null } },
    select: { googleEventId: true },
  });
  for (const a of comEvento) {
    await deleteEvent(nutritionist.id, a.googleEventId!);
  }

  await prisma.patient.delete({ where: { id: patientId } });

  revalidatePath("/pacientes");
  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath("/");
  redirect("/pacientes?excluido=1");
}

// ---------- Perfil profissional ----------

// Esses dados vão impressos no plano que o paciente leva para casa. O CRN é o
// que transforma a folha em um documento com autoria — por isso o campo existe.
export async function saveProfile(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const name = optional(formData.get("name"), 120);

  await prisma.nutritionist.update({
    where: { id: nutritionist.id },
    data: {
      ...(name ? { name } : {}), // o nome nunca pode ficar vazio
      crn: optional(formData.get("crn"), 40),
      phone: optional(formData.get("phone"), 40),
      city: optional(formData.get("city"), 80),
      clinic: optional(formData.get("clinic"), 120),
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/");
}

// ---------- Alimentos próprios e receitas ----------

export async function createFood(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();

  const name = optional(formData.get("name"));
  if (!name) return;

  // Modo receita: os macros vêm dos ingredientes, divididos pelo rendimento.
  //
  // O rendimento (peso final) importa porque preparar muda o peso: arroz
  // absorve água e pesa mais; carne perde água e pesa menos. Sem isso, os
  // valores por 100 g da preparação sairiam errados.
  const ingredientesJson = optional(formData.get("ingredientes"), 8000);
  if (ingredientesJson) {
    let itens: { foodId: string; grams: number }[] = [];
    try {
      const bruto = JSON.parse(ingredientesJson);
      if (Array.isArray(bruto)) {
        itens = bruto
          .filter((i) => i && typeof i.foodId === "string" && Number(i.grams) > 0)
          .map((i) => ({ foodId: i.foodId as string, grams: Number(i.grams) }));
      }
    } catch {
      return;
    }
    if (itens.length === 0) return;

    const foods = await prisma.food.findMany({
      where: {
        id: { in: itens.map((i) => i.foodId) },
        OR: [{ nutritionistId: null }, { nutritionistId: nutritionist.id }],
      },
    });
    const porId = new Map(foods.map((f) => [f.id, f]));

    let total = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0 };
    let pesoDosIngredientes = 0;
    for (const item of itens) {
      const f = porId.get(item.foodId);
      if (!f) continue;
      const fator = item.grams / 100;
      total = {
        kcal: total.kcal + f.kcal * fator,
        proteinG: total.proteinG + f.proteinG * fator,
        carbG: total.carbG + f.carbG * fator,
        fatG: total.fatG + f.fatG * fator,
      };
      pesoDosIngredientes += item.grams;
    }
    if (pesoDosIngredientes === 0) return;

    const rendimento = optionalNumber(formData.get("rendimento")) ?? pesoDosIngredientes;
    const por100 = 100 / Math.max(rendimento, 1);

    await prisma.food.create({
      data: {
        name,
        category: optional(formData.get("category")) ?? "Preparações",
        kcal: Math.round(total.kcal * por100 * 100) / 100,
        proteinG: Math.round(total.proteinG * por100 * 100) / 100,
        carbG: Math.round(total.carbG * por100 * 100) / 100,
        fatG: Math.round(total.fatG * por100 * 100) / 100,
        nutritionistId: nutritionist.id,
      },
    });
    revalidatePath("/alimentos");
    return;
  }

  // Modo manual: o nutricionista digita os valores do rótulo do produto.
  const kcal = optionalNumber(formData.get("kcal"));
  if (kcal === null || kcal < 0) return;

  await prisma.food.create({
    data: {
      name,
      category: optional(formData.get("category")) ?? "Meus alimentos",
      kcal,
      proteinG: Math.max(optionalNumber(formData.get("proteinG")) ?? 0, 0),
      carbG: Math.max(optionalNumber(formData.get("carbG")) ?? 0, 0),
      fatG: Math.max(optionalNumber(formData.get("fatG")) ?? 0, 0),
      nutritionistId: nutritionist.id,
    },
  });

  revalidatePath("/alimentos");
}

export async function deleteFood(formData: FormData) {
  const nutritionist = await getCurrentNutritionist();
  const id = formData.get("id")!.toString();

  // Só apaga alimento PRÓPRIO — os da TACO são compartilhados por todos.
  const meu = await prisma.food.findFirst({
    where: { id, nutritionistId: nutritionist.id },
  });
  if (!meu) return;

  await prisma.food.delete({ where: { id } });
  revalidatePath("/alimentos");
}

// ---------- Registro clínico e anotações ----------

export async function addNote(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  if (!(await requireOwnPatient(patientId))) return;

  const content = optional(formData.get("content"));
  if (!content) return;

  const appointmentId = optional(formData.get("appointmentId"));

  // Se a nota é a evolução de uma consulta, confirmamos que a consulta é
  // deste paciente — o id vem do formulário e não é confiável.
  if (appointmentId) {
    const owned = await prisma.appointment.findFirst({
      where: { id: appointmentId, patientId },
      select: { id: true },
    });
    if (!owned) return;
  }

  await prisma.note.create({
    data: {
      patientId,
      appointmentId,
      kind: appointmentId ? "evolucao" : "nota",
      content: content.slice(0, 5000),
    },
  });

  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/");
}

export async function deleteNote(formData: FormData) {
  const id = formData.get("id")!.toString();
  const nutritionist = await getCurrentNutritionist();

  const note = await prisma.note.findFirst({
    where: { id, patient: { nutritionistId: nutritionist.id } },
  });
  if (!note) return;

  await prisma.note.delete({ where: { id } });
  revalidatePath(`/pacientes/${note.patientId}`);
}

export async function setPatientStatus(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  if (!(await requireOwnPatient(patientId))) return;

  const status = formData.get("status")?.toString() ?? "ativo";
  if (!["ativo", "inativo", "alta"].includes(status)) return;

  await prisma.patient.update({ where: { id: patientId }, data: { status } });

  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/pacientes");
  revalidatePath("/");
}

// Anamnese estruturada. Fica separada do cadastro básico porque é preenchida
// aos poucos, ao longo do acompanhamento — não na hora de criar o paciente.
export async function saveAnamnesis(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  if (!(await requireOwnPatient(patientId))) return;

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      restrictions: optional(formData.get("restrictions"), 500),
      conditions: optional(formData.get("conditions"), 500),
      medications: optional(formData.get("medications"), 500),
      bowelHabit: optional(formData.get("bowelHabit"), 100),
      familyHistory: optional(formData.get("familyHistory"), 500),
      anamnesis: optional(formData.get("anamnesis"), 5000),
      sleepHours: clampFaixa(optionalNumber(formData.get("sleepHours")), 0, 24),
      waterLiters: clampFaixa(optionalNumber(formData.get("waterLiters")), 0, 15),
    },
  });

  revalidatePath(`/pacientes/${patientId}`);
}

// Valor fora da faixa possível é erro de digitação, não dado — vira nulo.
function clampFaixa(v: number | null, min: number, max: number): number | null {
  if (v === null || v < min || v > max) return null;
  return Math.round(v * 10) / 10;
}

// Metas energéticas do paciente — decisão clínica, então tudo é editável.
export async function saveEnergyTargets(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  if (!(await requireOwnPatient(patientId))) return;

  const activity = optionalNumber(formData.get("activityLevel"));

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      activityLevel: activity && activity >= 1 && activity <= 2.5 ? activity : null,
      kcalTarget: (() => {
        const v = optionalNumber(formData.get("kcalTarget"));
        return v && v > 0 ? Math.round(Math.min(v, 10000)) : null;
      })(),
      proteinTarget: clampMacro(optionalNumber(formData.get("proteinTarget"))),
      carbTarget: clampMacro(optionalNumber(formData.get("carbTarget"))),
      fatTarget: clampMacro(optionalNumber(formData.get("fatTarget"))),
    },
  });

  revalidatePath(`/pacientes/${patientId}`);
}

function clampMacro(v: number | null): number | null {
  return v && v > 0 ? Math.round(Math.min(v, 2000) * 10) / 10 : null;
}

export async function removeMeal(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const mealIndex = Number(formData.get("mealIndex"));

  await updateMeals(planId, (meals) => meals.filter((_, i) => i !== mealIndex));
}

// Substituições: opções equivalentes que o paciente pode comer no lugar.
//
// A quantidade sugerida é a que iguala as CALORIAS do item original — é o
// critério usado na prática para lista de substituições. O nutricionista pode
// ajustar o valor antes de salvar.
export async function addSubstitution(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const mealIndex = Number(formData.get("mealIndex"));
  const itemIndex = Number(formData.get("itemIndex"));
  const foodId = optional(formData.get("foodId"));
  const grams = optionalNumber(formData.get("grams"));
  if (!foodId || !grams || grams <= 0) return;

  const nutritionist = await getCurrentNutritionist();
  const food = await prisma.food.findFirst({
    where: { id: foodId, OR: [{ nutritionistId: null }, { nutritionistId: nutritionist.id }] },
  });
  if (!food) return;

  const arredondado = Math.round(Math.min(grams, 5000));

  await updateMeals(planId, (meals) => {
    const item = meals[mealIndex]?.items[itemIndex];
    if (!item) return meals;
    const subs = item.subs ?? [];
    if (subs.length >= 6) return meals; // uma lista enorme confunde o paciente
    subs.push({ text: `${arredondado} g de ${food.name}`, foodId: food.id, grams: arredondado });
    item.subs = subs;
    return meals;
  });
}

export async function removeSubstitution(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const mealIndex = Number(formData.get("mealIndex"));
  const itemIndex = Number(formData.get("itemIndex"));
  const subIndex = Number(formData.get("subIndex"));

  await updateMeals(planId, (meals) => {
    const item = meals[mealIndex]?.items[itemIndex];
    if (!item?.subs) return meals;
    item.subs.splice(subIndex, 1);
    if (item.subs.length === 0) delete item.subs;
    return meals;
  });
}

export async function removeMealItem(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const mealIndex = Number(formData.get("mealIndex"));
  const itemIndex = Number(formData.get("itemIndex"));

  await updateMeals(planId, (meals) => {
    meals[mealIndex]?.items.splice(itemIndex, 1);
    return meals;
  });
}

// ---------- Link do plano para o paciente ----------

// Cria (ou renova) o endereço secreto que o paciente abre no celular.
//
// Renovar gera um token NOVO em vez de só esticar o prazo: se o link antigo
// vazou, esticar a validade prolongaria o vazamento. Token novo derruba o
// anterior na hora.
export async function sharePlan(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  if (!(await requireOwnPlan(planId))) return;

  await prisma.mealPlan.update({
    where: { id: planId },
    data: {
      shareToken: generateShareToken(),
      shareExpiresAt: defaultExpiry(new Date()),
    },
  });

  revalidatePath(`/planos/${planId}`);
}

// Corta o acesso imediatamente. Apagar o token é o que faz o link antigo
// virar página inexistente — não basta marcar como vencido.
export async function revokePlanShare(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  if (!(await requireOwnPlan(planId))) return;

  await prisma.mealPlan.update({
    where: { id: planId },
    data: { shareToken: null, shareExpiresAt: null },
  });

  revalidatePath(`/planos/${planId}`);
}

export async function deleteMealPlan(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  if (!(await requireOwnPlan(planId))) return;

  const plan = await prisma.mealPlan.delete({ where: { id: planId } });

  revalidatePath(`/pacientes/${plan.patientId}`);
  redirect(`/pacientes/${plan.patientId}`);
}
