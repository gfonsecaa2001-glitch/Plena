import Link from "next/link";
import { getCurrentNutritionist } from "@/lib/tenant";
import { Icon } from "@/lib/icons";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  await getCurrentNutritionist(); // gate de login

  return (
    <>
      <div className="page-header">
        <div className="title-with-icon">
          <span className="page-emoji">📥</span>
          <div>
            <h1>Importar pacientes</h1>
            <p>Traga sua carteira de uma planilha, sem cadastrar um por um</p>
          </div>
        </div>
        <Link className="btn secondary" href="/pacientes">
          <Icon name="back" size={15} /> Voltar
        </Link>
      </div>

      <ImportForm />
    </>
  );
}
