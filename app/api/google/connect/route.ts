import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentNutritionistOrNull } from "@/lib/tenant";
import { consentUrl, isGoogleConfigured } from "@/lib/google-calendar";

// Passo 1 do OAuth: manda o nutricionista para a tela de consentimento do Google.
export async function GET(request: NextRequest) {
  const nutritionist = await getCurrentNutritionistOrNull();
  if (!nutritionist) return NextResponse.redirect(new URL("/login", request.url));
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/integracoes?erro=config", request.url));
  }

  // "state" protege contra CSRF: o Google devolve esse valor no callback e nós
  // conferimos se bate com o cookie. Sem isso, alguém poderia forjar o retorno.
  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(consentUrl(request.nextUrl.origin, state));
}
