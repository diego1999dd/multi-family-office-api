import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
const { z } = require("zod");
const { generateSuggestions } = require("../suggestion-service");

export async function suggestionsRoutes(server: FastifyInstance) {
  const suggestionBodySchema = z.object({
    clientId: z.string().uuid(),
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
    "/suggestions",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const clientData = suggestionBodySchema.parse(request.body);
        const suggestions = await generateSuggestions(clientData);
        return reply.send(suggestions);
      } catch (error: any) {
        reply.status(400).send(error);
      }
    }
  );
}
