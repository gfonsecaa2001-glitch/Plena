import { NextRequest, NextResponse } from "next/server";

// O layout raiz é um Server Component e não enxerga a URL atual. Este
// middleware repassa o caminho num cabeçalho, para o layout saber quando NÃO
// desenhar o menu do sistema — caso das páginas públicas (/agendar/...), que
// são vistas por pacientes e não podem mostrar navegação interna.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
