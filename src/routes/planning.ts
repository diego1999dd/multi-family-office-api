
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
const { z } = require("zod");

export async function planningRoutes(server: FastifyInstance) {
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
        if (totalPatrimony === 0) {
          return reply.send({
            alignmentPercentage: null,
            category: "green",
          });
        }
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
        reply.status(400).send({message: "Invalid input."});
      }
    }
  );
}
