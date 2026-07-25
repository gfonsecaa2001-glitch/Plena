"use client";

import { Icon } from "@/lib/icons";

// Componente de cliente: window.print() só existe no navegador, então este
// botão precisa rodar lá — por isso o "use client" acima.
export function PrintButton() {
  return (
    <button className="btn secondary no-print" onClick={() => window.print()}>
      <Icon name="print" size={15} /> Imprimir / PDF
    </button>
  );
}
