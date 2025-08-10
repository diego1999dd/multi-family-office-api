
import type { FastifyRequest, FastifyReply } from 'fastify';
const { FastifyInstance } = require('fastify');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

export async function authRoutes(server: typeof FastifyInstance) {
  server.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const registerBodySchema = z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['ADVISOR', 'VIEWER']),
    });

    try {
      const { name, email, password, role } = registerBodySchema.parse(request.body);

      const userExists = await prisma.user.findUnique({
        where: { email },
      });

      if (userExists) {
        return reply.status(400).send({ message: 'User already exists.' });
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

      return reply.status(201).send({ message: 'User created successfully.' });
    } catch (error) {
      return reply.status(400).send({ message: 'Invalid input.', error });
    }
  });

  server.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
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
        return reply.status(401).send({ message: 'Invalid credentials.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return reply.status(401).send({ message: 'Invalid credentials.' });
      }

      const token = jwt.sign(
        {
          role: user.role,
        },
        'your-secret-key', // TODO: Use an environment variable for the secret key
        {
          subject: user.id.toString(),
          expiresIn: '1d',
        }
      );

      return reply.send({ token });
    } catch (error) {
      return reply.status(400).send({ message: 'Invalid input.', error });
    }
  });
}
