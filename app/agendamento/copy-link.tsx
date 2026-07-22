"use client";

import { useState } from "react";

// O endereço completo só é conhecido no navegador (window.location), por isso
// este pedaço roda no cliente.
export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  return (
    <div className="copy-link">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      <button
        className="btn small"
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copiado!" : "Copiar"}
      </button>
      <a className="btn small secondary" href={path} target="_blank" rel="noreferrer">
        Abrir
      </a>
    </div>
  );
}
