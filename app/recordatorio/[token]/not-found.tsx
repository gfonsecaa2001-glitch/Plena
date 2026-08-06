// Mesma tela para link inválido, vencido e desligado — não confirmamos que
// aquele endereço existiu.
export default function LinkIndisponivel() {
  return (
    <div className="public-plan" style={{ textAlign: "center", paddingTop: 70 }}>
      <span style={{ fontSize: 46 }}>🌿</span>
      <h1 style={{ fontSize: 24, margin: "14px 0 8px" }}>Link indisponível</h1>
      <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6 }}>
        Este endereço não está mais válido. Peça um link novo para a sua
        nutricionista — leva um segundo para ela gerar.
      </p>
    </div>
  );
}
