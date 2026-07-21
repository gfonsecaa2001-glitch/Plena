import { handlers } from "@/auth";

// O Auth.js cuida destas rotas (login, logout, sessão) sozinho.
export const { GET, POST } = handlers;
