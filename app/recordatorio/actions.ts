"use server";

// Gravação do recordatório pelo PACIENTE, sem login.
//
// É o único ponto do sistema em que alguém sem conta escreve dentro do
// prontuário. Por isso, três travas:
//   1. o token precisa existir e estar no prazo;
//   2. recordatório já enviado não aceita mais alteração;
//   3. limite por IP, porque a rota é pública.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isShareActive } from "@/lib/share";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import {
  parseDiario,
  serializeDiario,
  podeEnviar,
  type DiaRegistro,
  type RefeicaoRegistro,
} from "@/lib/diary";

const UMA_HORA = 60 * 60 * 1000;

async function carregarAberto(token: string) {
  const diario = await prisma.foodDiary.findUnique({ where: { token } });
  if (!diario) return null;
  if (!isShareActive(diario.token, diario.expiresAt, new Date())) return null;
  if (diario.submittedAt) return null; // já enviado: virou somente leitura
  return diario;
}

// Reconstrói o diário a partir do formulário.
//
// A ESTRUTURA vem do que está gravado (quantos dias, quais refeições), não do
// que o navegador mandou: o formulário só preenche TEXTO nas posições que já
// existem. Assim ninguém injeta dias ou refeições extras pelo campo.
function aplicarFormulario(base: DiaRegistro[], formData: FormData): DiaRegistro[] {
  return base.map((dia, i) => {
    const data = formData.get(`dia-${i}-data`)?.toString().trim();
    const refeicoes: RefeicaoRegistro[] = dia.refeicoes.map((ref, j) => ({
      nome: ref.nome,
      hora: formData.get(`dia-${i}-ref-${j}-hora`)?.toString().trim() || undefined,
      texto: (formData.get(`dia-${i}-ref-${j}`)?.toString() ?? "").trim().slice(0, 1000),
    }));

    return {
      data: /^\d{4}-\d{2}-\d{2}$/.test(data ?? "") ? data! : dia.data,
      tipico: formData.get(`dia-${i}-tipico`) !== "nao",
      obs: (formData.get(`dia-${i}-obs`)?.toString() ?? "").trim().slice(0, 500),
      refeicoes,
    };
  });
}

async function gravar(token: string, formData: FormData, enviar: boolean) {
  const ip = await clientIp();
  // 40 gravações por hora por IP: sobra para quem salva a cada refeição,
  // e corta quem resolver martelar a rota.
  const limite = await checkRateLimit(`recordatorio:ip:${ip}`, 40, UMA_HORA);
  if (!limite.ok) redirect(`/recordatorio/${token}?erro=limite`);

  const diario = await carregarAberto(token);
  if (!diario) redirect(`/recordatorio/${token}`);

  const dias = aplicarFormulario(parseDiario(diario.content), formData);

  if (enviar && !podeEnviar(dias)) {
    // Enviar em branco não ajuda ninguém — e o paciente perderia o acesso.
    redirect(`/recordatorio/${token}?erro=vazio`);
  }

  await prisma.foodDiary.update({
    where: { id: diario.id },
    data: {
      content: serializeDiario(dias),
      ...(enviar ? { submittedAt: new Date() } : {}),
    },
  });

  revalidatePath(`/pacientes/${diario.patientId}`);
  redirect(`/recordatorio/${token}${enviar ? "" : "?salvo=1"}`);
}

export async function salvarRecordatorio(formData: FormData) {
  const token = formData.get("token")?.toString() ?? "";
  await gravar(token, formData, false);
}

export async function enviarRecordatorio(formData: FormData) {
  const token = formData.get("token")?.toString() ?? "";
  await gravar(token, formData, true);
}
