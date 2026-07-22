"use client";

// Menu lateral com ícones e indicação da página ativa.
// É componente de cliente porque precisa saber a URL atual (usePathname).

import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const ITEMS = [
  { href: "/", label: "Início", d: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" },
  {
    href: "/pacientes",
    label: "Pacientes",
    d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    href: "/agenda",
    label: "Agenda",
    d: "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  },
  {
    href: "/planos",
    label: "Planos alimentares",
    d: "M3 2v7a3 3 0 0 0 6 0V2M6 2v20M17 2c-2 2-3 4.5-3 7 0 2 1 3 3 3s3-1 3-3c0-2.5-1-5-3-7ZM17 12v10",
  },
  {
    href: "/integracoes",
    label: "Integrações",
    d: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19",
  },
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
            <Icon d={item.d} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div className="soon">
        <Icon d="M2 7h20v13H2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 12h20" />
        <span>
          Financeiro<small>em breve</small>
        </span>
      </div>

      {isAdmin && (
        <Link
          className={`nav-item nav-admin${pathname.startsWith("/admin") ? " active" : ""}`}
          href="/admin"
        >
          <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <span>Administração</span>
        </Link>
      )}
    </nav>
  );
}
