import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");

const prisma = new PrismaClient();

export async function clientRoutes(server: FastifyInstance) {
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
}
