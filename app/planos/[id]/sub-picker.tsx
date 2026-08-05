"use client";

// Seletor de substituições de um item do plano.
//
// Ao escolher o alimento, a quantidade já vem calculada para igualar as
// CALORIAS do item original — o critério usado na prática para montar lista
// de trocas. O nutricionista pode ajustar antes de salvar.

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";

type Food = { id: string; name: string; category: string; kcal: number };

export function SubPicker({
  planId,
  mealIndex,
  itemIndex,
  kcalAlvo,
  action,
}: {
  planId: string;
  mealIndex: number;
  itemIndex: number;
  kcalAlvo: number;
  action: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Food[]>([]);
  const [escolhido, setEscolhido] = useState<Food | null>(null);
  const [grams, setGrams] = useState(0);
  const [aberto, setAberto] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (escolhido || query.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/foods?q=${encodeURIComponent(query)}`);
        const d = await r.json();
        setResultados(d.foods ?? []);
        setAberto(true);
      } catch {
        setResultados([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, escolhido]);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  function escolher(food: Food) {
    setEscolhido(food);
    setAberto(false);
    // Quantidade que iguala as calorias do item original
    const equivalente = food.kcal > 0 ? Math.round((kcalAlvo / food.kcal) * 100) : 100;
    setGrams(Math.max(1, Math.min(equivalente, 5000)));
  }

  return (
    <details className="sub-form no-print">
      <summary>
        <Icon name="plus" size={12} /> substituição
      </summary>

      <form
        action={action}
        onSubmit={() => {
          setTimeout(() => {
            setEscolhido(null);
            setQuery("");
            setResultados([]);
          }, 0);
        }}
      >
        <input type="hidden" name="planId" value={planId} />
        <input type="hidden" name="mealIndex" value={mealIndex} />
        <input type="hidden" name="itemIndex" value={itemIndex} />
        {escolhido && <input type="hidden" name="foodId" value={escolhido.id} />}

        <div className="sub-row" ref={boxRef}>
          <div className="food-search">
            <span className="food-search-icon">
              <Icon name="search" size={14} />
            </span>
            {escolhido ? (
              <div className="food-chosen">
                <span>{escolhido.name}</span>
                <button type="button" onClick={() => setEscolhido(null)} aria-label="Trocar">
                  ×
                </button>
              </div>
            ) : (
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Trocar por…"
                autoComplete="off"
              />
            )}

            {aberto && !escolhido && resultados.length > 0 && (
              <ul className="food-results">
                {resultados.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => escolher(f)}>
                      <span className="food-result-name">{f.name}</span>
                      <span className="food-result-meta">
                        {Math.round(f.kcal)} kcal/100g ·{" "}
                        {f.kcal > 0 ? Math.round((kcalAlvo / f.kcal) * 100) : "?"} g equivalem
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {escolhido && (
            <div className="food-grams">
              <input
                name="grams"
                type="number"
                min={1}
                max={5000}
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value) || 0)}
                aria-label="Quantidade em gramas"
              />
              <span>g</span>
            </div>
          )}

          <button className="btn small" type="submit" disabled={!escolhido}>
            Adicionar
          </button>
        </div>
      </form>
    </details>
  );
}
