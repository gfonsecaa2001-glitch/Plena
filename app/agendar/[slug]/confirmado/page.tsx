import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ h?: string }>;
}) {
  const { slug } = await params;
  const { h } = await searchParams;

  const nutritionist = await prisma.nutritionist.findUnique({
    where: { bookingSlug: slug },
    select: { name: true },
  });

  const when = h ? new Date(h) : null;
  const valid = when && !Number.isNaN(when.getTime());

  return (
    <div className="booking-page">
      <div className="booking-card" style={{ textAlign: "center" }}>
        <div className="confirm-check">✓</div>
        <h1 style={{ marginBottom: 6 }}>Consulta agendada!</h1>
        {valid && (
          <p style={{ fontSize: 17, margin: "0 0 6px" }}>
            <strong>{formatDateTime(when)}</strong>
          </p>
        )}
        <p className="muted" style={{ fontSize: 14 }}>
          com {nutritionist?.name ?? "seu nutricionista"}
        </p>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 18 }}>
          Anote na sua agenda. Se precisar remarcar, entre em contato com o consultório.
        </p>
      </div>
      <p className="booking-footer">
        Agendamento por <strong>Plena</strong>
      </p>
    </div>
  );
}
