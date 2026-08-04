import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildSlots } from "@/lib/booking";
import { todayISO } from "@/lib/datetime";
import { bookPublicAppointment } from "../actions";
import { SlotPicker } from "./slot-picker";

// Página PÚBLICA — sem login. É o link que o nutricionista manda pro paciente.
export const dynamic = "force-dynamic";

// Título e descrição personalizados na prévia do link (WhatsApp, Instagram).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const n = await prisma.nutritionist
    .findUnique({ where: { bookingSlug: slug }, select: { name: true } })
    .catch(() => null);

  const title = n ? `Agendar consulta com ${n.name}` : "Agendar consulta";
  const description = "Escolha o melhor horário — leva menos de um minuto.";

  return { title, description, openGraph: { title, description, type: "website" } };
}

const ERROS: Record<string, string> = {
  dados: "Preencha seu nome e escolha um horário.",
  contato: "Informe um e-mail ou telefone para confirmarmos.",
  horario: "Horário inválido. Escolha outro.",
  ocupado: "Ops! Esse horário acabou de ser preenchido. Escolha outro.",
  indisponivel: "Os agendamentos online estão temporariamente fechados.",
  limite: "Muitas tentativas de agendamento. Tente novamente em alguns minutos.",
};

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { slug } = await params;
  const { erro } = await searchParams;

  const nutritionist = await prisma.nutritionist.findUnique({
    where: { bookingSlug: slug },
    // Só o necessário para a tela pública: nada de tokens, e-mail ou pacientes.
    select: {
      id: true,
      name: true,
      bookingEnabled: true,
      bookingDays: true,
      bookingStart: true,
      bookingEnd: true,
      bookingSlotMin: true,
    },
  });

  if (!nutritionist) notFound();

  const busy = nutritionist.bookingEnabled
    ? await prisma.appointment.findMany({
        where: { nutritionistId: nutritionist.id, status: { not: "cancelada" } },
        select: { scheduledAt: true },
      })
    : [];

  const days = nutritionist.bookingEnabled
    ? buildSlots(nutritionist, busy.map((b) => b.scheduledAt), todayISO(), new Date())
    : [];

  return (
    <div className="booking-page">
      <div className="booking-card">
        <div className="booking-head">
          <div className="booking-logo">
            Plena<span>.</span>
          </div>
          <h1>Agendar consulta</h1>
          <p className="muted">
            com <strong>{nutritionist.name}</strong> · nutrição
          </p>
        </div>

        {erro && <p className="auth-error">{ERROS[erro] ?? "Não foi possível agendar."}</p>}

        {!nutritionist.bookingEnabled ? (
          <p className="empty">
            Os agendamentos online estão fechados no momento. Entre em contato diretamente.
          </p>
        ) : days.length === 0 ? (
          <p className="empty">Nenhum horário disponível nas próximas semanas.</p>
        ) : (
          <SlotPicker days={days} slug={slug} action={bookPublicAppointment} />
        )}
      </div>
      <p className="booking-footer">
        Agendamento por <strong>Plena</strong> — CRM para nutricionistas
      </p>
    </div>
  );
}
