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

// Função principal que constrói a aplicação Fastify
export async function buildApp() {
  const app = Fastify({ logger: true });
  const prisma = new PrismaClient();

  app.register(fastifyMultipart);

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    return { hello: "world" };
  });

  // Autenticação JWT
  const authRoutes: FastifyPluginAsync = async (server, options) => {
    server.post("/auth/register", async (request, reply) => {
      const registerBodySchema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["ADVISOR", "VIEWER"]),
      });
      try {
        const { name, email, password, role } = registerBodySchema.parse(
          request.body
        );
        const userExists = await prisma.user.findUnique({
          where: { email },
        });
        if (userExists) {
          return reply.status(400).send({ message: "User already exists." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role,
          },
        });
        return reply
          .status(201)
          .send({ message: "User created successfully." });
      } catch (error) {
        return reply.status(400).send({ message: "Invalid input.", error });
      }
    });

    server.post("/auth/login", async (request, reply) => {
      const loginBodySchema = z.object({
        email: z.string().email(),
        password: z.string(),
      });
      try {
        const { email, password } = loginBodySchema.parse(request.body);
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) {
          return reply.status(401).send({ message: "Invalid credentials." });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return reply.status(401).send({ message: "Invalid credentials." });
        }
        const token = jwt.sign(
          {
            role: user.role,
          },
          process.env.JWT_SECRET!,
          {
            subject: user.id.toString(),
            expiresIn: "1d",
          }
        );
        return reply.send({ token });
      } catch (error) {
        return reply.status(400).send({ message: "Invalid input.", error });
      }
    });
  };
  app.register(authRoutes);

  const clientRoutes: FastifyPluginAsync = async (server, options) => {
    // Schemas de validação
    const clientSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      age: z.number().int().positive(),
      status: z.string(),
      phone: z.string().optional(),
      address: z.string().optional(),
      totalPatrimony: z.number().nullable().default(null),
    });

    server.post("/clients", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const clientData = clientSchema.parse(request.body);
        const newClient = await prisma.client.create({
          data: clientData,
        });
        return reply.status(201).send(newClient);
      } catch (error: any) {
        reply.status(400).send(error);
      }
    });

    server.get("/clients", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const clients = await prisma.client.findMany();
        return reply.send(clients);
      } catch (error: any) {
        reply.status(500).send(error);
      }
    });

    server.get(
      "/clients/:id",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { id } = request.params as { id: string };
          const client = await prisma.client.findUnique({
            where: { id },
          });
          if (!client) {
            return reply.status(404).send({ message: "Client not found" });
          }
          return reply.send(client);
        } catch (error: any) {
          reply.status(500).send(error);
        }
      }
    );

    server.put(
      "/clients/:id",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { id } = request.params as { id: string };
          const clientData = clientSchema.partial().parse(request.body); // Allow partial updates
          const updatedClient = await prisma.client.update({
            where: { id },
            data: clientData,
          });
          return reply.send(updatedClient);
        } catch (error: any) {
          if (error.code === 'P2025') { // Prisma "not found" error
            return reply.status(404).send({ message: "Client not found" });
          }
          reply.status(400).send(error);
        }
      }
    );

    server.delete(
      "/clients/:id",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { id } = request.params as { id: string };
          await prisma.client.delete({
            where: { id },
          });
          return reply.status(204).send();
        } catch (error: any) {
          if (error.code === 'P2025') { // Prisma "not found" error
            return reply.status(404).send({ message: "Client not found" });
          }
          reply.status(500).send(error);
        }
      }
    );
  };
  app.register(clientRoutes);

  const planningRoutes: FastifyPluginAsync = async (server, options) => {
    const planningSchema = z.object({
      totalPatrimony: z.number(),
      goals: z.array(
        z.object({
          targetValue: z.number(),
          targetDate: z.string().datetime(),
        })
      ),
      wallet: z.object({
        classes: z.string(),
        percentages: z.number(),
      }),
    });

    server.post(
      "/planning",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { totalPatrimony, goals, wallet } = planningSchema.parse(
            request.body as any
          );
          const totalInPlan = goals.reduce(
            (acc: number, goal: { targetValue: number }) =>
              acc + goal.targetValue,
            0
          );
          const alignmentPercentage = (totalInPlan / totalPatrimony) * 100;
          let category = "red";
          if (alignmentPercentage >= 80) {
            category = "green";
          } else if (alignmentPercentage >= 50) {
            category = "yellow";
          }
          return { alignmentPercentage, category };
        } catch (error) {
          reply.status(400).send(error);
        }
      }
    );
  };
  app.register(planningRoutes);

  await app.ready();
  return app;
}

// Inicia o servidor se o arquivo for o ponto de entrada principal
if (require.main === module) {
  buildApp().then((app) => {});
}
