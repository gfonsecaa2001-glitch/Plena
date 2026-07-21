"use client";

// Componente de cliente: window.print() só existe no navegador, então este
// botão precisa rodar lá — por isso o "use client" acima.
export function PrintButton() {
  return (
    <button className="btn secondary no-print" onClick={() => window.print()}>
      🖨️ Imprimir / PDF
    </button>
  );
}
