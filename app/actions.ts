"use server";

// Server Actions: funções que rodam no servidor e podem ser chamadas
// diretamente de um <form>. É o jeito mais simples de gravar dados no Next.js —
// sem precisar criar rotas de API à parte.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionist } from "@/lib/tenant";
import { parseMeals, serializeMeals } from "@/lib/mealplan";
import { parseDateInput, parseDateTimeInput } from "@/lib/datetime";
import { pushEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";

function optional(value: FormDataEntryValue | null): string | null {
  const s = value?.toString().trim();
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

export async function createMealPlan(formData: FormData) {
  const patientId = formData.get("patientId")!.toString();
  if (!(await requireOwnPatient(patientId))) return;
  const title = optional(formData.get("title")) ?? "Plano alimentar";

  const plan = await prisma.mealPlan.create({
    data: { patientId, title },
  });

  redirect(`/planos/${plan.id}`);
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
  const item = optional(formData.get("item"));
  if (!item) return;

  await updateMeals(planId, (meals) => {
    meals[mealIndex]?.items.push(item);
    return meals;
  });
}

export async function removeMeal(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  const mealIndex = Number(formData.get("mealIndex"));

  await updateMeals(planId, (meals) => meals.filter((_, i) => i !== mealIndex));
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

export async function deleteMealPlan(formData: FormData) {
  const planId = formData.get("planId")!.toString();
  if (!(await requireOwnPlan(planId))) return;

  const plan = await prisma.mealPlan.delete({ where: { id: planId } });

  revalidatePath(`/pacientes/${plan.patientId}`);
  redirect(`/pacientes/${plan.patientId}`);
}
