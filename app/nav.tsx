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
  { href: "/agendamento", label: "Link de agendamento", icon: "link" },
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
      <div className="soon">
        <Icon name="wallet" />
        <span>
          Financeiro<small>em breve</small>
        </span>
      </div>

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
