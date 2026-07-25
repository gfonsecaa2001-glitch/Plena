import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

// Prévia do link de agendamento no WhatsApp/Instagram.
//
// Personalizada com o nome do nutricionista: quem recebe o link vê
// "Agende sua consulta com Ana Souza" em vez de um retângulo vazio.
// Só o nome é usado — nenhum dado de paciente aparece aqui.

export const alt = "Agendar consulta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const nutritionist = await prisma.nutritionist
    .findUnique({ where: { bookingSlug: slug }, select: { name: true } })
    .catch(() => null);

  const name = nutritionist?.name ?? "seu nutricionista";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f5f4ec",
        }}
      >
        {/* Faixa de marca à esquerda */}
        <div
          style={{
            width: 90,
            height: "100%",
            background: "linear-gradient(180deg, #2a3620, #1a2114)",
          }}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "70px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              // Sem isso a etiqueta esticaria a largura toda: num container
              // em coluna, os filhos ocupam 100% por padrão.
              alignSelf: "flex-start",
              fontSize: 28,
              color: "#4a6b35",
              background: "#eef1e4",
              border: "1px solid #dfe4d0",
              borderRadius: 999,
              padding: "12px 28px",
              marginBottom: 36,
            }}
          >
            {/* Sem emoji de propósito: o gerador de imagem buscaria o desenho
                do emoji em um servidor externo a cada requisição. */}
            Agendamento online
          </div>

          <div style={{ fontSize: 40, color: "#7d8171", marginBottom: 10 }}>
            Agende sua consulta com
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#262b20",
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            {name}
          </div>

          <div style={{ fontSize: 32, color: "#5c6152", marginTop: 30 }}>
            Escolha o melhor horário — leva menos de um minuto.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: "auto",
              color: "#7d8171",
              fontSize: 26,
            }}
          >
            <svg width="34" height="34" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="15" fill="#2a3620" />
              <path d="M32 53 V33" stroke="#a9c284" strokeWidth="5" strokeLinecap="round" />
              <path d="M32 37 C 18 37, 11 27, 13 12 C 28 12, 34 23, 32 37 Z" fill="#6f9a4d" />
              <path d="M32 37 C 46 37, 53 27, 51 12 C 36 12, 30 23, 32 37 Z" fill="#a9c284" />
            </svg>
            <div style={{ display: "flex" }}>
              Agendamento por <span style={{ fontWeight: 700, marginLeft: 8 }}>Plena</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
