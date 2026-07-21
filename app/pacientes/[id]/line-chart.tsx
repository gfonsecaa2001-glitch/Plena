"use client";

// Gráfico de linha desenhado "na mão" com SVG — sem biblioteca externa.
// Um SVG é como um desenho vetorial: nós convertemos cada medição (data, valor)
// em uma coordenada (x, y) dentro da área do gráfico e ligamos os pontos.
// É um componente de cliente ("use client") por causa do hover: seguir o mouse
// e mostrar o tooltip só dá pra fazer no navegador.

import { useState } from "react";

export type ChartSeries = {
  label: string;
  color: string;
  // pontos já ordenados por data; time = milissegundos (Date.getTime())
  points: { time: number; value: number }[];
};

const W = 560;
const H = 220;
const M = { top: 14, right: 84, bottom: 26, left: 44 }; // margens pra eixos e rótulos

function formatDate(time: number) {
  return new Date(time).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function LineChart({
  title,
  unit,
  series,
}: {
  title: string;
  unit: string;
  series: ChartSeries[];
}) {
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) return null;

  // Escalas: convertem "data" → x em pixels e "valor" → y em pixels.
  const times = allPoints.map((p) => p.time);
  const values = allPoints.map((p) => p.value);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const pad = (Math.max(...values) - Math.min(...values)) * 0.15 || 1;
  const vMin = Math.min(...values) - pad;
  const vMax = Math.max(...values) + pad;

  const x = (t: number) =>
    tMax === tMin
      ? (M.left + W - M.right) / 2
      : M.left + ((t - tMin) / (tMax - tMin)) * (W - M.left - M.right);
  const y = (v: number) => M.top + (1 - (v - vMin) / (vMax - vMin)) * (H - M.top - M.bottom);

  // 4 linhas de grade horizontais com valores "redondos"
  const ticks = [0, 1, 2, 3].map((i) => vMin + ((vMax - vMin) * i) / 3);

  // Datas únicas (pro hover encaixar na medição mais próxima)
  const uniqueTimes = [...new Set(times)].sort((a, b) => a - b);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = uniqueTimes.reduce((best, cur) => (Math.abs(x(cur) - px) < Math.abs(x(best) - px) ? cur : best));
    setHoverTime(t);
  }

  const hovered = hoverTime === null ? null : {
    time: hoverTime,
    values: series
      .map((s) => ({ label: s.label, color: s.color, point: s.points.find((p) => p.time === hoverTime) }))
      .filter((v) => v.point),
  };

  return (
    <div className="chart">
      <div className="chart-title-row">
        <h3>{title}</h3>
        {series.length > 1 && (
          <div className="chart-legend">
            {series.map((s) => (
              <span key={s.label}>
                <i style={{ background: s.color }} /> {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", display: "block" }}
          onMouseMove={onMove}
          onMouseLeave={() => setHoverTime(null)}
          role="img"
          aria-label={`Gráfico de ${title}`}
        >
          {/* grade e eixo y */}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="#e1e0d9" strokeWidth={1} />
              <text x={M.left - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10.5} fill="#898781">
                {Number(v.toFixed(1))}
              </text>
            </g>
          ))}

          {/* eixo x: primeira e última data */}
          <text x={M.left} y={H - 8} fontSize={10.5} fill="#898781">
            {formatDate(tMin)}
          </text>
          <text x={W - M.right} y={H - 8} textAnchor="end" fontSize={10.5} fill="#898781">
            {formatDate(tMax)}
          </text>

          {/* crosshair do hover */}
          {hovered && (
            <line
              x1={x(hovered.time)}
              x2={x(hovered.time)}
              y1={M.top}
              y2={H - M.bottom}
              stroke="#c3c2b7"
              strokeWidth={1}
            />
          )}

          {/* as linhas de dados */}
          {series.map((s) => (
            <g key={s.label}>
              <polyline
                points={s.points.map((p) => `${x(p.time)},${y(p.value)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p) => (
                <circle
                  key={p.time}
                  cx={x(p.time)}
                  cy={y(p.value)}
                  r={p.time === hoverTime ? 5 : 3.5}
                  fill={s.color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
              {/* rótulo direto no fim da linha (identifica a série sem depender só da cor) */}
              <text
                x={x(s.points[s.points.length - 1].time) + 8}
                y={y(s.points[s.points.length - 1].value) + 3.5}
                fontSize={11}
                fontWeight={600}
                fill="#52514e"
              >
                {series.length > 1
                  ? s.label
                  : `${s.points[s.points.length - 1].value} ${unit}`}
              </text>
            </g>
          ))}
        </svg>

        {/* tooltip */}
        {hovered && hovered.values.length > 0 && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(x(hovered.time) / W) * 100}%`,
              transform: x(hovered.time) > W * 0.6 ? "translateX(-105%)" : "translateX(8px)",
            }}
          >
            <div className="chart-tooltip-date">{formatDate(hovered.time)}</div>
            {hovered.values.map((v) => (
              <div key={v.label}>
                <i style={{ background: v.color }} /> {v.label}: <strong>{v.point!.value} {unit}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
