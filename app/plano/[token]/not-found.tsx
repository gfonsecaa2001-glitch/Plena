// Quem cai aqui é um paciente, não um desenvolvedor — a tela padrão de "404"
// não ajudaria em nada.
//
// A mensagem é a mesma para link inválido, plano apagado e link vencido, de
// propósito: dizer "este link expirou" confirmaria para um curioso que aquele
// endereço um dia existiu.
export default function LinkIndisponivel() {
  return (
    <div className="public-plan" style={{ textAlign: "center", paddingTop: 70 }}>
      <span style={{ fontSize: 46 }}>🌿</span>
      <h1 style={{ fontSize: 24, margin: "14px 0 8px" }}>Link indisponível</h1>
      <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6 }}>
        Este endereço não está mais válido. Peça um link novo para o seu
        nutricionista — leva um segundo para ele gerar.
      </p>
    </div>
  );
}
