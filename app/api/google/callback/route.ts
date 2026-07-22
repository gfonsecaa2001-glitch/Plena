import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentNutritionistOrNull } from "@/lib/tenant";
import { exchangeCode } from "@/lib/google-calendar";

// Passo 2 do OAuth: o Google devolve um "code" aqui. Trocamos por tokens.
export async function GET(request: NextRequest) {
  const nutritionist = await getCurrentNutritionistOrNull();
  if (!nutritionist) return NextResponse.redirect(new URL("/login", request.url));

  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get("google_oauth_state")?.value;
  jar.delete("google_oauth_state");

  // Recusou a permissão, ou o state não confere (possível CSRF): aborta.
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/integracoes?erro=negado", request.url));
  }

  const tokens = await exchangeCode(url.origin, code);
  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/integracoes?erro=token", request.url));
  }

  // Descobre qual conta Google foi conectada (só para mostrar na tela).
  let googleEmail: string | null = null;
  try {
    const info = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }).then((r) => r.json());
    googleEmail = info?.email ?? null;
  } catch {
    /* opcional */
  }

  await prisma.nutritionist.update({
    where: { id: nutritionist.id },
    data: {
      googleEmail,
      googleAccessToken: tokens.access_token,
      // O refresh_token só vem na primeira autorização — não sobrescrever com null.
      ...(tokens.refresh_token ? { googleRefreshToken: tokens.refresh_token } : {}),
      googleTokenExpiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
    },
  });

  return NextResponse.redirect(new URL("/integracoes?ok=1", request.url));
}
