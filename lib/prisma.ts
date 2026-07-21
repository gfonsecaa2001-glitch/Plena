import { PrismaClient } from "@prisma/client";

// Em desenvolvimento o Next recarrega o código a cada mudança; sem este
// cache global, cada reload abriria uma nova conexão com o banco.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
