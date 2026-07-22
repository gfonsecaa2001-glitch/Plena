// Integração com o Google Agenda.
//
// Conversa direto com a API REST do Google via fetch — sem SDK, pra manter o
// projeto leve e o fluxo visível (é bom entender o que acontece).
//
// Como funciona o OAuth, em 4 passos:
//   1. Mandamos o nutricionista para a tela de consentimento do Google
//   2. Ele autoriza e o Google devolve um "code" para /api/google/callback
//   3. Trocamos esse code por um access_token (curto) + refresh_token (longo)
//   4. Guardamos os dois. Quando o access_token vence, o refresh_token gera outro
//
// REGRA DE OURO deste arquivo: nada aqui pode derrubar o Plena. Se o Google
// estiver fora do ar ou o token for revogado, a consulta ainda é salva no
// sistema — a sincronização apenas não acontece.

import { prisma } from "./prisma";
import { TZ } from "./datetime";

const SCOPE = "https://www.googleapis.com/auth/calendar.events email";
const DURATION_MIN = 60; // duração padrão de uma consulta

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string) {
  return `${origin}/api/google/callback`;
}

export function consentUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // pede o refresh_token
    prompt: "consent", // garante que o refresh_token venha mesmo em reconexões
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

export async function exchangeCode(origin: string, code: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

// Devolve um access_token válido, renovando se necessário. null = não conectado.
async function validAccessToken(nutritionistId: string): Promise<string | null> {
  const n = await prisma.nutritionist.findUnique({ where: { id: nutritionistId } });
  if (!n?.googleRefreshToken) return null;

  const stillValid =
    n.googleAccessToken && n.googleTokenExpiry && n.googleTokenExpiry.getTime() > Date.now() + 60_000;
  if (stillValid) return n.googleAccessToken;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: n.googleRefreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data: TokenResponse = await res.json();
  if (!data.access_token) return null;

  await prisma.nutritionist.update({
    where: { id: nutritionistId },
    data: {
      googleAccessToken: data.access_token,
      googleTokenExpiry: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    },
  });
  return data.access_token;
}

function eventBody(patientName: string, start: Date, notes: string | null) {
  const end = new Date(start.getTime() + DURATION_MIN * 60_000);
  return {
    summary: `Consulta — ${patientName}`,
    description: [notes, "Agendado pelo Plena"].filter(Boolean).join("\n\n"),
    start: { dateTime: start.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
    reminders: { useDefault: true },
  };
}

// --- Operações usadas pelas server actions. Todas silenciam erros. ---

export async function pushEvent(
  nutritionistId: string,
  appointmentId: string,
  patientName: string,
  start: Date,
  notes: string | null
) {
  try {
    const token = await validAccessToken(nutritionistId);
    if (!token) return;

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(eventBody(patientName, start, notes)),
      }
    );
    const data = await res.json();
    if (data?.id) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: data.id },
      });
    }
  } catch {
    // Google indisponível: a consulta já está salva no Plena, seguimos.
  }
}

export async function updateEvent(
  nutritionistId: string,
  googleEventId: string,
  patientName: string,
  start: Date,
  notes: string | null,
  status: string
) {
  try {
    const token = await validAccessToken(nutritionistId);
    if (!token) return;

    const body = {
      ...eventBody(patientName, start, notes),
      summary:
        status === "cancelada"
          ? `[Cancelada] Consulta — ${patientName}`
          : status === "faltou"
            ? `[Faltou] Consulta — ${patientName}`
            : `Consulta — ${patientName}`,
    };

    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } catch {
    /* silencioso por design */
  }
}

export async function deleteEvent(nutritionistId: string, googleEventId: string) {
  try {
    const token = await validAccessToken(nutritionistId);
    if (!token) return;
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    /* silencioso por design */
  }
}
