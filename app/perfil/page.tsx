import { getCurrentNutritionist } from "@/lib/tenant";
import { saveProfile } from "@/app/actions";
import { Icon } from "@/lib/icons";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const nutritionist = await getCurrentNutritionist();

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">🎓</span>
          <div>
            <h1>Meu perfil</h1>
            <p>Seus dados profissionais — eles assinam os planos que o paciente leva</p>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 className="section-title">
          <Icon name="award" size={17} /> Identificação profissional
        </h2>
        <p className="muted" style={{ marginTop: -10, fontSize: 13.5 }}>
          O plano alimentar impresso é um documento: sem o CRN, ele não identifica quem
          prescreveu. Preencha uma vez e ele passa a sair no cabeçalho de todos os planos.
        </p>

        <form className="stack" action={saveProfile}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" name="name" defaultValue={nutritionist.name} required />
            </div>
            <div className="field">
              <label htmlFor="crn">CRN</label>
              <input
                id="crn"
                name="crn"
                defaultValue={nutritionist.crn ?? ""}
                placeholder="CRN-3 12345"
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="clinic">Consultório ou marca</label>
              <input
                id="clinic"
                name="clinic"
                defaultValue={nutritionist.clinic ?? ""}
                placeholder="Opcional — ex.: Clínica Viver Bem"
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefone de contato</label>
              <input
                id="phone"
                name="phone"
                defaultValue={nutritionist.phone ?? ""}
                placeholder="(11) 98765-4321"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="city">Cidade</label>
            <input
              id="city"
              name="city"
              defaultValue={nutritionist.city ?? ""}
              placeholder="São Paulo — SP"
            />
          </div>

          <div>
            <button className="btn" type="submit">
              <Icon name="check" size={15} /> Salvar
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2 className="section-title">
          <Icon name="mail" size={17} /> Conta
        </h2>
        <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
          Você entra com <strong>{nutritionist.email}</strong>. O e-mail de acesso não é
          alterado por aqui — se precisar trocar, fale com o suporte.
        </p>
      </div>
    </>
  );
}
