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

  // Schemas de validação
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

  const eventSchema = z.object({
    tipo: z.string(),
    valor: z.number(),
    frequencia: z.enum(["unica", "mensal", "anual"]),
  });

  // Rotas da API
  app.post(
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

  app.post("/clients", async (request: FastifyRequest, reply: FastifyReply) => {
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

  app.post(
    "/simulation-history",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const simulationData = simulationHistorySchema.parse(request.body);
        const newSimulation = await prisma.simulationHistory.create({
          data: {
            clientId: simulationData.clientId,
            simulationDate: simulationData.simulationDate
              ? new Date(simulationData.simulationDate)
              : new Date(),
            parameters: simulationData.parameters,
            results: simulationData.results,
          },
        });
        return reply.status(201).send(newSimulation);
      } catch (error: any) {
        reply.status(400).send(error);
      }
    }
  );

  app.get("/clients", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const clients = await prisma.client.findMany();
      return reply.send(clients);
    } catch (error: any) {
      reply.status(500).send(error);
    }
  });

  app.get(
    "/simulation-history/:clientId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = request.params as { clientId: string };
        const simulations = await prisma.simulationHistory.findMany({
          where: { clientId },
          orderBy: { simulationDate: "desc" },
        });
        return reply.send(simulations);
      } catch (error: any) {
        reply.status(500).send(error);
      }
    }
  );

  const projectionSchema = z.object({
    initialWealth: z.number(),
    monthlyContribution: z.number(),
    monthlyGrowthRate: z.number(),
  });

  app.post(
    "/projection",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { initialWealth, monthlyContribution, monthlyGrowthRate } =
          projectionSchema.parse(request.body as any);
        const currentYear = new Date().getFullYear();
        const projectionMonths = (2060 - currentYear) * 12;
        const wealthCurve = simulateWealthCurve({
          initialWealth,
          monthlyContribution,
          monthlyGrowthRate,
          projectionMonths,
        });
        return { wealthCurve };
      } catch (error) {
        reply.status(400).send(error);
      }
    }
  );

  app.post("/eventos", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tipo, valor, frequencia } = eventSchema.parse(request.body);
      const evento = await prisma.eventos.create({
        data: {
          tipo,
          valor,
          frequencia,
        },
      });
      return reply.status(201).send(evento);
    } catch (error) {
      reply.status(400).send(error);
    }
  });

  app.get("/eventos", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const eventos = await prisma.eventos.findMany();
      return reply.send(eventos);
    } catch (error) {
      reply.status(500).send(error);
    }
  });

  app.get(
    "/eventos/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const evento = await prisma.eventos.findUnique({
          where: { id },
        });
        if (!evento) {
          return reply.status(404).send({ message: "Evento not found" });
        }
        return reply.send(evento);
      } catch (error) {
        reply.status(500).send(error);
      }
    }
  );

  app.put(
    "/eventos/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { tipo, valor, frequencia } = eventSchema.parse(request.body);
        const evento = await prisma.eventos.update({
          where: { id },
          data: {
            tipo,
            valor,
            frequencia,
          },
        });
        return reply.send(evento);
      } catch (error) {
        reply.status(400).send(error);
      }
    }
  );

  app.delete(
    "/eventos/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        await prisma.eventos.delete({
          where: { id },
        });
        return reply.status(204).send();
      } catch (error) {
        reply.status(500).send(error);
      }
    }
  );

  app.get(
    "/suggestions/:clientId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = request.params as { clientId: string };
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          include: {
            goals: true,
            wallet: true,
          },
        });
        if (!client) {
          return reply.status(404).send({ message: "Client not found" });
        }
        if (
          client.totalPatrimony === null ||
          client.totalPatrimony === undefined
        ) {
          return reply
            .status(400)
            .send({ message: "Client totalPatrimony not set." });
        }
        const clientDataForSuggestions: ClientDataForSuggestions = {
          clientId: client.id,
          totalPatrimony: client.totalPatrimony,
          goals: client.goals.map((goal: Goals) => ({
            targetValue: goal.targetValue,
            targetDate: goal.targetDate,
          })),
          wallet: client.wallet
            ? {
                classes: client.wallet.classes,
                percentages: client.wallet.percentages,
              }
            : { classes: "", percentages: 0 },
        };
        const suggestions = await generateSuggestions(clientDataForSuggestions);
        return reply.send(suggestions);
      } catch (error) {
        reply.status(500).send(error);
      }
    }
  );

  app.post(
    "/import-clients-sse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const sendEvent = (data: any) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };
      try {
        const data = await (request as any).file();
        if (!data) {
          sendEvent({ status: "error", message: "No file uploaded." });
          reply.raw.end();
          return;
        }
        let processedRows = 0;
        const clientsToCreate: any[] = [];
        data.file
          .pipe(csv())
          .on("data", (row: Record<string, string | undefined>) => {
            clientsToCreate.push({
              name: row.name,
              email: row.email,
              age: parseInt(row.age ?? "0"),
              status: row.status,
              totalPatrimony: Number(row.totalPatrimony ?? "0"),
            });
          })
          .on("end", async () => {
            sendEvent({
              status: "processing",
              message: `Found ${clientsToCreate.length} clients. Starting import...`,
            });
            for (const clientData of clientsToCreate) {
              try {
                await prisma.client.create({ data: clientData });
                processedRows++;
                sendEvent({
                  status: "progress",
                  message: `Processed ${processedRows} of ${clientsToCreate.length} clients.`,
                  processed: processedRows,
                  total: clientsToCreate.length,
                });
              } catch (dbError: any) {
                app.log.error(
                  `Error importing client ${clientData.email}:`,
                  dbError
                );
                sendEvent({
                  status: "warning",
                  message: `Failed to import client ${clientData.email}.`,
                  error: dbError.message,
                });
              }
            }
            sendEvent({
              status: "complete",
              message: `Successfully imported ${processedRows} clients.`,
            });
            reply.raw.end();
          })
          .on("error", (err: any) => {
            app.log.error("CSV parsing error:", err);
            sendEvent({
              status: "error",
              message: "Error parsing CSV file.",
              error: err.message,
            });
            reply.raw.end();
          });
      } catch (error: any) {
        app.log.error("File upload error:", error);
        sendEvent({
          status: "error",
          message: "Error processing file upload.",
          error: error.message,
        });
        reply.raw.end();
      }
    }
  );

  await app.ready();
  return app;
}

// Inicia o servidor se o arquivo for o ponto de entrada principal
if (require.main === module) {
  buildApp().then((app) => {
    app.listen({ port: 3000, host: "0.0.0.0" }).then(() => {
      console.log("Server is running at http://localhost:3000");
    });
  });
}
