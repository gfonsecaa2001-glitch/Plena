import { Icon } from "@/lib/icons";
import { whatsappLink } from "@/lib/whatsapp";

// Botão que abre o WhatsApp com a mensagem pronta.
//
// Quando o paciente não tem telefone válido, o botão simplesmente não aparece:
// um botão que não funciona é pior que botão nenhum, e um número mal digitado
// abriria a conversa com um desconhecido.
export function WaButton({
  phone,
  message,
  label = "WhatsApp",
  small = false,
  title,
}: {
  phone: string | null | undefined;
  message: string;
  label?: string;
  small?: boolean;
  title?: string;
}) {
  const href = whatsappLink(phone, message);
  if (!href) return null;

  return (
    <a
      className={`btn whatsapp${small ? " small" : ""}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title ?? "Abre o WhatsApp com a mensagem pronta — você revisa antes de enviar"}
    >
      <Icon name="whatsapp" size={small ? 13 : 15} /> {label}
    </a>
  );
}
