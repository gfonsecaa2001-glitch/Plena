"use server";

// Ação PÚBLICA: roda sem ninguém logado, chamada por um paciente qualquer.
// Por isso cada dado recebido é tratado como não confiável e revalidado aqui.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildSlots } from "@/lib/booking";
import { todayISO } from "@/lib/datetime";
import { pushEvent } from "@/lib/google-calendar";

function clean(value: FormDataEntryValue | null, max = 120): string | null {
  const s = value?.toString().trim().slice(0, max);
  return s ? s : null;
}

export async function bookPublicAppointment(formData: FormData) {
  const slug = clean(formData.get("slug"), 40);
  const slotIso = clean(formData.get("slot"), 40);
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email"))?.toLowerCase() ?? null;
  const phone = clean(formData.get("phone"), 30);
  const note = clean(formData.get("note"), 300);

  if (!slug || !slotIso || !name) redirect(`/agendar/${slug ?? ""}?erro=dados`);
  // Exigir ao menos uma forma de contato — sem isso o nutricionista não
  // consegue confirmar nem remarcar.
  if (!email && !phone) redirect(`/agendar/${slug}?erro=contato`);

  const nutritionist = await prisma.nutritionist.findUnique({ where: { bookingSlug: slug } });
  if (!nutritionist?.bookingEnabled) redirect(`/agendar/${slug}?erro=indisponivel`);

  const slot = new Date(slotIso);
  if (Number.isNaN(slot.getTime())) redirect(`/agendar/${slug}?erro=horario`);

  // REVALIDAÇÃO: o formulário pode ter sido adulterado, ou alguém pode ter
  // marcado o mesmo horário enquanto esta pessoa preenchia os dados.
  // Recalculamos os horários livres e conferimos se este ainda está na lista.
  const busy = await prisma.appointment.findMany({
    where: { nutritionistId: nutritionist.id, status: { not: "cancelada" } },
    select: { scheduledAt: true },
  });
  const days = buildSlots(nutritionist, busy.map((b) => b.scheduledAt), todayISO(), new Date());
  const stillFree = days.some((d) => d.slots.some((s) => s.iso === slot.toISOString()));
  if (!stillFree) redirect(`/agendar/${slug}?erro=ocupado`);

  // Paciente já existe? Casamos por e-mail (ou telefone) dentro desta conta.
  let patient = email
    ? await prisma.patient.findFirst({ where: { nutritionistId: nutritionist.id, email } })
    : null;
  if (!patient && phone) {
    patient = await prisma.patient.findFirst({
      where: { nutritionistId: nutritionist.id, phone },
    });
  }
  if (!patient) {
    patient = await prisma.patient.create({
      data: { nutritionistId: nutritionist.id, name, email, phone },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      nutritionistId: nutritionist.id,
      patientId: patient.id,
      scheduledAt: slot,
      notes: note,
      source: "publico",
    },
  });

  await pushEvent(nutritionist.id, appointment.id, patient.name, slot, note);

  revalidatePath("/agenda");
  revalidatePath("/");
  redirect(`/agendar/${slug}/confirmado?h=${encodeURIComponent(slot.toISOString())}`);
}
