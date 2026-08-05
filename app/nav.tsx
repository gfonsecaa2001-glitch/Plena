"use client";

// Menu lateral com ícones e indicação da página ativa.
// É componente de cliente porque precisa saber a URL atual (usePathname).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/lib/icons";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/pacientes", label: "Pacientes", icon: "patients" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/planos", label: "Planos alimentares", icon: "meal" },
  { href: "/alimentos", label: "Meus alimentos", icon: "clipboard" },
  { href: "/financeiro", label: "Financeiro", icon: "wallet" },
  { href: "/alertas", label: "Alertas", icon: "bell" },
  { href: "/agendamento", label: "Link de agendamento", icon: "link" },
  { href: "/perfil", label: "Meu perfil", icon: "award" },
  { href: "/integracoes", label: "Integrações", icon: "settings" },
];

export function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      {ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            className={`nav-item${active ? " active" : ""}`}
            href={item.href}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {isAdmin && (
        <Link
          className={`nav-item nav-admin${pathname.startsWith("/admin") ? " active" : ""}`}
          href="/admin"
        >
          <Icon name="shield" />
          <span>Administração</span>
        </Link>
      )}
    </nav>
  );
}
