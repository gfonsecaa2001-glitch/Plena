import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionistOrNull } from "@/lib/tenant";

// Busca de alimentos para o seletor do plano alimentar.
// Retorna os alimentos públicos da TACO + os criados pelo próprio nutricionista.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const nutritionist = await getCurrentNutritionistOrNull();
  if (!nutritionist) return NextResponse.json({ foods: [] }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ foods: [] });

  const foods = await prisma.food.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      OR: [{ nutritionistId: null }, { nutritionistId: nutritionist.id }],
    },
    orderBy: { name: "asc" },
    take: 25,
    select: {
      id: true,
      name: true,
      category: true,
      kcal: true,
      proteinG: true,
      carbG: true,
      fatG: true,
    },
  });

  return NextResponse.json({ foods });
}
