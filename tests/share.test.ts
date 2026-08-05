import { describe, it, expect } from "vitest";
import {
  generateShareToken,
  isShareActive,
  defaultExpiry,
  shareUrl,
  DIAS_DE_VALIDADE,
} from "@/lib/share";

describe("generateShareToken", () => {
  it("gera endereços seguros para URL", () => {
    const token = generateShareToken();
    // base64url não usa "+", "/" nem "=" — esses quebrariam o endereço.
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43); // 256 bits em base64url
  });

  it("nunca repete", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateShareToken()));
    expect(tokens.size).toBe(500);
  });
});

describe("isShareActive", () => {
  const agora = new Date("2026-08-05T12:00:00-03:00");

  it("plano nunca compartilhado não tem link ativo", () => {
    expect(isShareActive(null, null, agora)).toBe(false);
    expect(isShareActive(undefined, defaultExpiry(agora), agora)).toBe(false);
  });

  it("link dentro do prazo está ativo", () => {
    expect(isShareActive("abc", defaultExpiry(agora), agora)).toBe(true);
  });

  // O ponto do prazo é justamente este: o link para de funcionar sozinho,
  // mesmo que o paciente tenha guardado o endereço.
  it("link vencido não está ativo", () => {
    const ontem = new Date(agora.getTime() - 86400000);
    expect(isShareActive("abc", ontem, agora)).toBe(false);
  });

  it("o vencimento é no instante exato, não no dia seguinte", () => {
    const exato = new Date(agora.getTime());
    expect(isShareActive("abc", exato, agora)).toBe(false);
    expect(isShareActive("abc", new Date(agora.getTime() + 1), agora)).toBe(true);
  });

  it("sem prazo definido, o link não expira", () => {
    expect(isShareActive("abc", null, agora)).toBe(true);
  });
});

describe("defaultExpiry", () => {
  it("dá o prazo padrão de acompanhamento", () => {
    const inicio = new Date("2026-08-05T12:00:00-03:00");
    const fim = defaultExpiry(inicio);
    const dias = (fim.getTime() - inicio.getTime()) / 86400000;
    expect(dias).toBe(DIAS_DE_VALIDADE);
  });
});

describe("shareUrl", () => {
  it("monta o endereço completo", () => {
    expect(shareUrl("tok123", "https://plenacrm.vercel.app")).toBe(
      "https://plenacrm.vercel.app/plano/tok123"
    );
  });

  it("não gera barra dupla quando a base já termina em barra", () => {
    expect(shareUrl("tok123", "https://plenacrm.vercel.app/")).toBe(
      "https://plenacrm.vercel.app/plano/tok123"
    );
  });
});
