"use client";

// Seletor de alimentos da tabela TACO.
//
// Fluxo: o nutricionista digita, escolhe um alimento, ajusta a quantidade em
// gramas e vê na hora quantas calorias e macros aquilo representa — antes de
// adicionar. Também aceita texto livre, para quem prefere escrever à mão.

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";

type Food = {
  id: string;
  name: string;
  category: string;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export function FoodPicker({
  planId,
  mealIndex,
  action,
}: {
  planId: string;
  mealIndex: number;
  action: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [chosen, setChosen] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Busca com atraso de 250 ms: evita disparar uma requisição por tecla.
  useEffect(() => {
    if (chosen || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.foods ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, chosen]);

  // Fecha a lista ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const f = grams / 100;
  const preview = chosen
    ? {
        kcal: Math.round(chosen.kcal * f),
        protein: Math.round(chosen.proteinG * f * 10) / 10,
        carb: Math.round(chosen.carbG * f * 10) / 10,
        fat: Math.round(chosen.fatG * f * 10) / 10,
      }
    : null;

  return (
    <form
      className="food-picker no-print"
      action={action}
      onSubmit={() => {
        // Limpa depois de enviar para o próximo alimento
        setTimeout(() => {
          setChosen(null);
          setQuery("");
          setGrams(100);
          setResults([]);
        }, 0);
      }}
    >
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="mealIndex" value={mealIndex} />
      {chosen && <input type="hidden" name="foodId" value={chosen.id} />}

      <div className="food-picker-row" ref={boxRef}>
        <div className="food-search">
          <span className="food-search-icon">
            <Icon name="search" size={15} />
          </span>
          {chosen ? (
            <div className="food-chosen">
              <span>{chosen.name}</span>
              <button
                type="button"
                aria-label="Trocar alimento"
                onClick={() => {
                  setChosen(null);
                  setQuery("");
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <input
              name="item"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Buscar alimento na tabela TACO ou escrever livremente…"
              autoComplete="off"
            />
          )}

          {open && !chosen && results.length > 0 && (
            <ul className="food-results">
              {results.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setChosen(food);
                      setOpen(false);
                    }}
                  >
                    <span className="food-result-name">{food.name}</span>
                    <span className="food-result-meta">
                      {Math.round(food.kcal)} kcal/100g · {food.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {chosen && (
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

        <button className="btn small" type="submit">
          <Icon name="plus" size={14} /> Adicionar
        </button>
      </div>

      {preview && (
        <div className="food-preview">
          <strong>{preview.kcal} kcal</strong>
          <span>P {preview.protein} g</span>
          <span>C {preview.carb} g</span>
          <span>G {preview.fat} g</span>
        </div>
      )}
    </form>
  );
}
