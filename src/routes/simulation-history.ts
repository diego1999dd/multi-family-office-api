import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");

const prisma = new PrismaClient();

export async function simulationHistoryRoutes(server: FastifyInstance) {
  const simulationHistorySchema = z.object({
    clientId: z.string().uuid(),
    simulationDate: z.string().datetime().optional(),
    parameters: z.object({
      initialWealth: z.number(),
      monthlyContribution: z.number(),
      monthlyGrowthRate: z.number(),
      projectionMonths: z.number(),
    }),
    results: z.object({
      wealthCurve: z.array(z.number()),
    }),
  });

  // Create a new simulation history entry
  server.post(
    "/simulation-history",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const simulationData = simulationHistorySchema.parse(request.body);
        const newSimulation = await prisma.simulationHistory.create({
          data: simulationData,
        });
        return reply.status(201).send(newSimulation);
      } catch (error: any) {
        reply.status(400).send(error);
      }
    }
  );

  // Get all simulation history entries for a client
  server.get(
    "/simulation-history/client/:clientId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = request.params as { clientId: string };
        const simulations = await prisma.simulationHistory.findMany({
          where: { clientId },
        });
        return reply.send(simulations);
      } catch (error: any) {
        reply.status(500).send(error);
      }
    }
  );

  // Get a single simulation history entry by ID
  server.get(
    "/simulation-history/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const simulation = await prisma.simulationHistory.findUnique({
          where: { id },
        });
        if (!simulation) {
          return reply.status(404).send({ message: "Simulation history not found" });
        }
        return reply.send(simulation);
      } catch (error: any) {
        reply.status(500).send(error);
      }
    }
  );

  // Update a simulation history entry
  server.put(
    "/simulation-history/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const simulationData = simulationHistorySchema.partial().parse(request.body);
        const updatedSimulation = await prisma.simulationHistory.update({
          where: { id },
          data: simulationData,
        });
        return reply.send(updatedSimulation);
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.status(404).send({ message: "Simulation history not found" });
        }
        reply.status(400).send(error);
      }
    }
  );

  // Delete a simulation history entry
  server.delete(
    "/simulation-history/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        await prisma.simulationHistory.delete({
          where: { id },
        });
        return reply.status(204).send();
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.status(404).send({ message: "Simulation history not found" });
        }
        reply.status(500).send(error);
      }
    }
  );
}
