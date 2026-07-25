import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Verificação de saúde — e "despertador" do banco.
//
// O Neon no plano gratuito desliga o banco após 5 minutos sem uso. A primeira
// consulta depois disso precisa ligá-lo de novo, o que leva alguns segundos e
// é sentido como travamento.
//
// Apontar um monitor gratuito (UptimeRobot, cron-job.org) para esta rota a
// cada ~4 minutos durante o horário de atendimento mantém o banco acordado.
// Fora do horário ele dorme — o que preserva as horas de computação incluídas
// no plano gratuito.
//
// Não expõe nada: sem autenticação, mas também sem dado algum.

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, dbMs: Date.now() - started });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
