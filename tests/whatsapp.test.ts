import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  whatsappLink,
  firstName,
  lembreteConsulta,
} from "@/lib/whatsapp";

describe("normalizePhone", () => {
  it("aceita o formato que o nutricionista digita na mão", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("11 98765 4321")).toBe("5511987654321");
    expect(normalizePhone("11987654321")).toBe("5511987654321");
  });

  it("aceita telefone fixo (10 dígitos)", () => {
    expect(normalizePhone("(11) 3456-7890")).toBe("551134567890");
  });

  it("não duplica o código do país quando já veio", () => {
    expect(normalizePhone("+55 11 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("5511987654321")).toBe("5511987654321");
  });

  it("descarta o zero da operadora", () => {
    expect(normalizePhone("011 98765-4321")).toBe("5511987654321");
  });

  // Abrir a conversa com o número errado é pior que não ter o botão:
  // a mensagem com o nome do paciente iria para um desconhecido.
  it("devolve null quando o número não é confiável", () => {
    expect(normalizePhone("98765-4321")).toBeNull(); // sem DDD
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("não tenho")).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("monta o link com o texto codificado", () => {
    const link = whatsappLink("(11) 98765-4321", "Oi, Maria! Tudo bem?");
    expect(link).toBe("https://wa.me/5511987654321?text=Oi%2C%20Maria!%20Tudo%20bem%3F");
  });

  it("codifica quebras de linha e acentos", () => {
    const link = whatsappLink("11987654321", "linha 1\nconsulta às 10h");
    expect(link).toContain("%0A"); // quebra de linha
    expect(link).toContain("%C3%A0s"); // "às"
  });

  it("não gera link sem telefone válido", () => {
    expect(whatsappLink(null, "oi")).toBeNull();
    expect(whatsappLink("123", "oi")).toBeNull();
  });
});

describe("firstName", () => {
  it("pega só o primeiro nome", () => {
    expect(firstName("Maria Aparecida Silva")).toBe("Maria");
    expect(firstName("  João  ")).toBe("João");
    expect(firstName("Ana")).toBe("Ana");
  });
});

describe("mensagens", () => {
  it("o lembrete traz data, hora e a assinatura do nutricionista", () => {
    // 10h no horário de Brasília
    const quando = new Date("2026-08-10T10:00:00-03:00");
    const texto = lembreteConsulta("Maria Silva", "Gabriel Fonseca", quando);

    expect(texto).toContain("Oi, Maria!");
    expect(texto).toContain("10/08/2026");
    expect(texto).toContain("10:00");
    expect(texto).toContain("Gabriel Fonseca");
  });
});
