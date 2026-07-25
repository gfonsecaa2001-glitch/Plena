// Carregamento das páginas públicas de agendamento: o esqueleto imita o
// cartão centralizado, não o painel do sistema.
export default function Loading() {
  return (
    <div className="booking-page">
      <div className="booking-card" aria-busy="true" aria-label="Carregando">
        <div className="sk sk-line" style={{ width: "35%", height: 22 }} />
        <div className="sk sk-line" style={{ width: "60%", height: 24, marginTop: 16 }} />
        <div className="sk sk-line" style={{ width: "45%", height: 14, marginTop: 10 }} />
        <div style={{ display: "flex", gap: 7, marginTop: 22 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="sk" key={i} style={{ width: 54, height: 52, borderRadius: 11 }} />
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
            gap: 8,
            marginTop: 20,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="sk" key={i} style={{ height: 40, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
