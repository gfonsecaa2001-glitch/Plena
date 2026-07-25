// Esqueleto de carregamento.
//
// O Next.js mostra este arquivo INSTANTANEAMENTE quando você clica num link,
// enquanto busca os dados no servidor. Sem ele, o navegador fica parado na
// página antiga sem nenhum sinal de vida até a resposta chegar — é o que dava
// a sensação de "travou".
//
// O tempo total não muda; o que muda é a percepção: a interface responde na
// hora e o conteúdo entra quando fica pronto.

export default function Loading() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Carregando">
      <div className="sk-header">
        <div className="sk sk-avatar" />
        <div style={{ flex: 1 }}>
          <div className="sk sk-line" style={{ width: "38%", height: 26 }} />
          <div className="sk sk-line" style={{ width: "22%", height: 13, marginTop: 9 }} />
        </div>
      </div>

      <div className="sk-cards">
        {[0, 1, 2, 3].map((i) => (
          <div className="sk-card" key={i}>
            <div className="sk sk-chip" />
            <div className="sk sk-line" style={{ width: "45%", height: 28, marginTop: 13 }} />
            <div className="sk sk-line" style={{ width: "70%", height: 12, marginTop: 9 }} />
          </div>
        ))}
      </div>

      <div className="sk-panel">
        <div className="sk sk-line" style={{ width: "26%", height: 18 }} />
        {[0, 1, 2, 3].map((i) => (
          <div className="sk-row" key={i}>
            <div className="sk sk-avatar small" />
            <div className="sk sk-line" style={{ flex: 1 }} />
            <div className="sk sk-line" style={{ width: 84 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
