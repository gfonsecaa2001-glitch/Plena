import { ImageResponse } from "next/og";

// Imagem que aparece quando alguém compartilha o link do Plena (WhatsApp,
// Instagram, LinkedIn). Sem ela, o link vira um retângulo cinza vazio.
//
// O Next gera a imagem no servidor a partir deste JSX — por isso o estilo é
// escrito à mão: aqui não existe CSS externo nem classes.

export const alt = "Plena — CRM para nutricionistas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(145deg, #1a2114 0%, #2a3620 55%, #35452a 100%)",
          color: "#f4f3e8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 48 }}>
          <svg width="72" height="72" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="15" fill="rgba(255,255,255,0.08)" />
            <path d="M32 53 V33" stroke="#a9c284" strokeWidth="5" strokeLinecap="round" />
            <path d="M32 37 C 18 37, 11 27, 13 12 C 28 12, 34 23, 32 37 Z" fill="#6f9a4d" />
            <path d="M32 37 C 46 37, 53 27, 51 12 C 36 12, 30 23, 32 37 Z" fill="#a9c284" />
          </svg>
          {/* O motor de imagem (Satori) exige display:flex em qualquer div com
              mais de um filho — por isso o wrapper explícito aqui. */}
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>
            Plena<span style={{ color: "#a9c284" }}>.</span>
          </div>
        </div>

        <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.12, maxWidth: 900 }}>
          Seu consultório de nutrição, pleno.
        </div>

        <div style={{ fontSize: 32, color: "#b9bfa6", marginTop: 28, maxWidth: 860 }}>
          Pacientes, avaliações com gráficos, agenda e planos alimentares —
          tudo num só lugar.
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 48 }}>
          {["Prontuário e evolução", "Agenda online", "Planos alimentares"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 24,
                color: "#d5dac2",
                background: "rgba(169,194,132,0.15)",
                border: "1px solid rgba(169,194,132,0.3)",
                borderRadius: 999,
                padding: "12px 26px",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
