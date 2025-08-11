import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");

const prisma = new PrismaClient();

export async function eventosRoutes(server: FastifyInstance) {
  const eventoSchema = z.object({
    clientId: z.string().uuid(),
    tipo: z.string(),
    valor: z.number(),
    frequencia: z.string(),
  });

  // Criar um novo evento
  server.post(
    "/eventos",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const eventoData = eventoSchema.parse(request.body);
        const newEvento = await prisma.evento.create({
          data: eventoData,
        });
        return reply.status(201).send(newEvento);
      } catch (error: any) {
        reply.status(400).send(error);
      }
    }
  );

  // Obter todos os eventos de um cliente
  server.get(
    "/eventos/client/:clientId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { clientId } = request.params as { clientId: string };
        const eventos = await prisma.evento.findMany({
          where: { clientId },
        });
        return reply.send(eventos);
      } catch (error: any) {
        reply.status(500).send(error);
      }
    }
  );

  // Atualizar um evento
  server.put(
    "/eventos/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const eventoData = eventoSchema.partial().parse(request.body);
        const updatedEvento = await prisma.evento.update({
          where: { id },
          data: eventoData,
        });
        return reply.send(updatedEvento);
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.status(404).send({ message: "Evento not found" });
        }
        reply.status(400).send(error);
      }
    }
  );

  // Deletar um evento
  server.delete(
    "/eventos/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        await prisma.evento.delete({
          where: { id },
        });
        return reply.status(204).send();
      } catch (error: any) {
        if (error.code === "P2025") {
          return reply.status(404).send({ message: "Evento not found" });
        }
        reply.status(500).send(error);
      }
    }
  );
}
