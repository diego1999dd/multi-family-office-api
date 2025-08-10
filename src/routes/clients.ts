import type { FastifyInstance } from "fastify";
const { PrismaClient, Goals } = require("@prisma/client");
const { z } = require("zod");
const fastifyMultipart = require("@fastify/multipart");
const csv = require("csv-parser");
  const { generateSuggestions } = require("../suggestion-service.ts");

// A função de plugin, que recebe a instância do Fastify e o objeto de opções (prisma)
export default async function clientRoutes(
  app: FastifyInstance,
  options: { prisma: typeof PrismaClient }
) {
  const prisma = options.prisma;

  app.register(fastifyMultipart);

  const clientSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    age: z.number().int().positive(),
    status: z.string(),
    totalPatrimony: z.number().nullable().default(null),
  });

  const simulationHistorySchema = z.object({
    clientId: z.string().uuid(),
    simulationDate: z.string().datetime().optional(),
    parameters: z.any(),
    results: z.any(),
  });

  // Rotas de clientes e outras funcionalidades relacionadas
  app.post("/clients", async (request, reply) => {
    // ... código da rota
  });

  app.get("/clients", async (request, reply) => {
    // ... código da rota
  });

  // Outras rotas como /simulation-history, /suggestions, /import-clients-sse
  // ...
}
