// Dinheiro em centavos.
//
// Todo valor monetário do sistema é um inteiro de centavos. Em ponto
// flutuante, 0.1 + 0.2 não é exatamente 0.3 — num relatório de faturamento
// esse resto vira diferença de caixa. Com inteiros, a soma é exata.

// Lê o que a pessoa digitou. Aceita as formas usadas no Brasil:
// "150", "150,00", "1.234,56", "R$ 150,00" — e também "150.50" (ponto
// decimal), que aparece quando alguém copia de uma planilha.
export function parseMoneyToCents(input: string | null | undefined): number | null {
  if (!input) return null;

  let s = input.toString().trim().replace(/[R$\s]/gi, "");
  if (!s) return null;

  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");

  if (temVirgula && temPonto) {
    // "1.234,56" — ponto é separador de milhar, vírgula é decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    // "150,50"
    s = s.replace(",", ".");
  } else if (temPonto) {
    // Ambíguo: "1.234" (milhar) ou "150.50" (decimal copiado de planilha).
    // Se depois do último ponto vêm exatamente 3 dígitos, é milhar.
    const depois = s.split(".").pop() ?? "";
    if (depois.length === 3) s = s.replace(/\./g, "");
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;

  // Arredondar ANTES de virar inteiro evita 1499.9999 → 1499
  return Math.round(n * 100);
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Valor sem o símbolo, para preencher campos de formulário ("150,00")
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export const STATUS_COBRANCA = [
  { value: "pendente", label: "Em aberto" },
  { value: "pago", label: "Recebido" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const METODOS = ["pix", "dinheiro", "cartao", "transferencia", "outro"] as const;

export function labelMetodo(m: string | null): string {
  const nomes: Record<string, string> = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    cartao: "Cartão",
    transferencia: "Transferência",
    outro: "Outro",
  };
  return m ? (nomes[m] ?? m) : "—";
}
