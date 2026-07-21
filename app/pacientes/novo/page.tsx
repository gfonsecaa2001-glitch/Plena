import { createPatient } from "@/app/actions";

export default function NewPatientPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Novo paciente</h1>
          <p>Só o nome é obrigatório — o resto você completa na primeira consulta.</p>
        </div>
      </div>

      <div className="panel">
        <form className="stack" action={createPatient}>
          <div className="field">
            <label htmlFor="name">Nome completo *</label>
            <input id="name" name="name" required autoFocus />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefone / WhatsApp</label>
              <input id="phone" name="phone" />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="birthDate">Data de nascimento</label>
              <input id="birthDate" name="birthDate" type="date" />
            </div>
            <div className="field">
              <label htmlFor="sex">Sexo</label>
              <select id="sex" name="sex" defaultValue="">
                <option value="">—</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="goal">Objetivo</label>
            <input id="goal" name="goal" placeholder="Ex.: emagrecimento, hipertrofia, reeducação alimentar…" />
          </div>

          <div className="field">
            <label htmlFor="anamnesis">Anamnese / histórico clínico</label>
            <textarea
              id="anamnesis"
              name="anamnesis"
              rows={5}
              placeholder="Alergias, medicamentos, histórico familiar, rotina alimentar…"
            />
          </div>

          <div>
            <button className="btn" type="submit">
              Salvar paciente
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
