"use client";

// Construtor de receitas: o nutricionista monta uma preparação a partir de
// ingredientes da TACO e o sistema calcula os valores por 100 g dela.
//
// O campo "rendimento" existe porque preparar muda o peso — arroz absorve
// água e pesa mais, carne perde água e pesa menos. Sem informar o peso final,
// os valores por 100 g da preparação sairiam errados.

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

type Ingrediente = { food: Food; grams: number };

export function RecipeBuilder({ action }: { action: (formData: FormData) => void }) {
  const [modo, setModo] = useState<"receita" | "manual">("receita");
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [rendimento, setRendimento] = useState<string>("");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Food[]>([]);
  const [aberto, setAberto] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
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
  }, [query]);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const pesoIngredientes = ingredientes.reduce((s, i) => s + i.grams, 0);
  const pesoFinal = Number(rendimento) > 0 ? Number(rendimento) : pesoIngredientes;

  const total = ingredientes.reduce(
    (acc, i) => {
      const f = i.grams / 100;
      return {
        kcal: acc.kcal + i.food.kcal * f,
        protein: acc.protein + i.food.proteinG * f,
        carb: acc.carb + i.food.carbG * f,
        fat: acc.fat + i.food.fatG * f,
      };
    },
    { kcal: 0, protein: 0, carb: 0, fat: 0 }
  );

  const por100 = pesoFinal > 0 ? 100 / pesoFinal : 0;
  const previa = {
    kcal: Math.round(total.kcal * por100),
    protein: Math.round(total.protein * por100 * 10) / 10,
    carb: Math.round(total.carb * por100 * 10) / 10,
    fat: Math.round(total.fat * por100 * 10) / 10,
  };

  return (
    <form className="stack" action={action} style={{ maxWidth: "none" }}>
      <div className="modo-tabs">
        <button
          type="button"
          className={`modo-tab${modo === "receita" ? " active" : ""}`}
          onClick={() => setModo("receita")}
        >
          Montar receita
        </button>
        <button
          type="button"
          className={`modo-tab${modo === "manual" ? " active" : ""}`}
          onClick={() => setModo("manual")}
        >
          Digitar do rótulo
        </button>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="name">Nome *</label>
          <input
            id="name"
            name="name"
            required
            placeholder={modo === "receita" ? "Bolo de banana da casa" : "Iogurte marca X"}
          />
        </div>
        <div className="field">
          <label htmlFor="category">Categoria</label>
          <input
            id="category"
            name="category"
            placeholder={modo === "receita" ? "Preparações" : "Meus alimentos"}
          />
        </div>
      </div>

      {modo === "receita" ? (
        <>
          {/* Enviado como JSON: o formulário é server action, e uma lista
              dinâmica cabe melhor num campo só. */}
          <input
            type="hidden"
            name="ingredientes"
            value={JSON.stringify(
              ingredientes.map((i) => ({ foodId: i.food.id, grams: i.grams }))
            )}
          />

          <div className="field" ref={boxRef} style={{ position: "relative" }}>
            <label>Ingredientes</label>
            <div className="food-search">
              <span className="food-search-icon">
                <Icon name="search" size={15} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar ingrediente na tabela TACO…"
                autoComplete="off"
              />
            </div>
            {aberto && resultados.length > 0 && (
              <ul className="food-results">
                {resultados.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIngredientes((atual) => [...atual, { food: f, grams: 100 }]);
                        setQuery("");
                        setAberto(false);
                      }}
                    >
                      <span className="food-result-name">{f.name}</span>
                      <span className="food-result-meta">
                        {Math.round(f.kcal)} kcal/100g · {f.category}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {ingredientes.length > 0 && (
            <ul className="ingredientes">
              {ingredientes.map((i, idx) => (
                <li key={idx}>
                  <span className="ing-nome">{i.food.name}</span>
                  <span className="food-grams">
                    <input
                      type="number"
                      min={1}
                      value={i.grams}
                      onChange={(e) =>
                        setIngredientes((atual) =>
                          atual.map((x, j) =>
                            j === idx ? { ...x, grams: Number(e.target.value) || 0 } : x
                          )
                        )
                      }
                      aria-label={`Gramas de ${i.food.name}`}
                    />
                    <span>g</span>
                  </span>
                  <button
                    type="button"
                    className="link-remove"
                    onClick={() => setIngredientes((a) => a.filter((_, j) => j !== idx))}
                    aria-label="Remover ingrediente"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="rendimento">Rendimento — peso final da preparação (g)</label>
            <input
              id="rendimento"
              name="rendimento"
              inputMode="numeric"
              value={rendimento}
              onChange={(e) => setRendimento(e.target.value)}
              placeholder={pesoIngredientes ? String(pesoIngredientes) : "peso depois de pronto"}
            />
            <small className="muted" style={{ fontSize: 12 }}>
              Ingredientes somam {pesoIngredientes} g. Deixe em branco se o peso não muda ao
              preparar.
            </small>
          </div>

          {ingredientes.length > 0 && (
            <div className="food-preview">
              <strong>{previa.kcal} kcal</strong>
              <span>P {previa.protein} g</span>
              <span>C {previa.carb} g</span>
              <span>G {previa.fat} g</span>
              <span className="muted">por 100 g da preparação</span>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Informe os valores <strong>por 100 g</strong>, como aparecem na tabela nutricional
            do produto.
          </p>
          <div className="energy-targets">
            <div className="field">
              <label htmlFor="kcal">Calorias *</label>
              <input id="kcal" name="kcal" inputMode="decimal" required />
            </div>
            <div className="field">
              <label htmlFor="proteinG">Proteína (g)</label>
              <input id="proteinG" name="proteinG" inputMode="decimal" />
            </div>
            <div className="field">
              <label htmlFor="carbG">Carboidrato (g)</label>
              <input id="carbG" name="carbG" inputMode="decimal" />
            </div>
            <div className="field">
              <label htmlFor="fatG">Gordura (g)</label>
              <input id="fatG" name="fatG" inputMode="decimal" />
            </div>
          </div>
        </>
      )}

      <div>
        <button className="btn" type="submit">
          <Icon name="plus" size={15} /> Salvar alimento
        </button>
      </div>
    </form>
  );
}
