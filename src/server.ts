import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import clientRoutes from "./routes/clients.js"; // <<< Aqui ele é importado

const app = Fastify({
  logger: true,
});

const prisma = new PrismaClient();

// <<< E aqui ele é registrado para que as rotas funcionem
app.register(clientRoutes, { prisma });

app.get("/", async (request, reply) => {
  return { hello: "world" };
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
