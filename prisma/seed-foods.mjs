// Carrega a tabela TACO no banco.
//
// Fonte: Tabela Brasileira de Composição de Alimentos (TACO) — NEPA/UNICAMP,
// via github.com/marcelosanto/tabela_taco (MIT). Valores por 100 g.
//
// Rodar: node prisma/seed-foods.mjs
// É idempotente: pode rodar de novo sem duplicar (usa tacoId como chave).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dir = path.dirname(fileURLToPath(import.meta.url));
const foods = JSON.parse(fs.readFileSync(path.join(dir, "taco-foods.json"), "utf8"));

const existentes = await prisma.food.findMany({
  where: { nutritionistId: null },
  select: { tacoId: true },
});
const jaTem = new Set(existentes.map((f) => f.tacoId));

const novos = foods.filter((f) => !jaTem.has(f.tacoId));

if (novos.length === 0) {
  console.log(`Nada a fazer — ${jaTem.size} alimentos já carregados.`);
} else {
  // createMany é uma única instrução no banco, muito mais rápido que 591 inserts.
  const { count } = await prisma.food.createMany({ data: novos });
  console.log(`${count} alimentos da TACO carregados (total: ${jaTem.size + count}).`);
}

await prisma.$disconnect();
