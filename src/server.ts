const Fastify = require("fastify");
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyPluginAsync,
} from "fastify";
const { PrismaClient } = require("@prisma/client");
import type { Goals } from "@prisma/client";
const fastifyMultipart = require("@fastify/multipart");
const { z } = require("zod");
const csv = require("csv-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Imports para os serviços e lógica
const { simulateWealthCurve } = require("./projection-engine-service");
const { generateSuggestions } = require("./suggestion-service");
import type { ClientDataForSuggestions } from "./suggestion-service";

import { authRoutes } from "./routes/auth";
import { clientRoutes } from "./routes/clients";
import { eventosRoutes } from "./routes/eventos";
import { planningRoutes } from "./routes/planning";
import { simulationHistoryRoutes } from "./routes/simulation-history";
import { suggestionsRoutes } from "./routes/suggestions";

// Função principal que constrói a aplicação Fastify
export async function buildApp() {
  const app = Fastify({ logger: true });
  const prisma = new PrismaClient();

  app.register(fastifyMultipart);

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    return { hello: "world" };
  });

  app.register(authRoutes);
  app.register(clientRoutes);
  app.register(eventosRoutes);
  app.register(planningRoutes);
  app.register(simulationHistoryRoutes);
  app.register(suggestionsRoutes);



  await app.ready();
  return app;
}

// Inicia o servidor se o arquivo for o ponto de entrada principal
if (require.main === module) {
  buildApp().then((app) => {});
}
