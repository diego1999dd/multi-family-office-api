import request from 'supertest';
import { buildApp } from '../server';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Eventos API', () => {
  let app: FastifyInstance;
  let client: any;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    client = await prisma.client.create({
      data: {
        name: 'Test Client',
        email: `test.client.${Date.now()}@example.com`,
        age: 30,
        status: 'active',
      },
    });
  });

  

  describe('POST /eventos', () => {
    test('should create a new evento', async () => {
      const eventoData = {
        clientId: client.id,
        tipo: 'meeting',
        valor: 100.0,
        frequencia: 'monthly',
      };

      const response = await request(app.server)
        .post('/eventos')
        .send(eventoData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    afterEach(async () => {
      await prisma.evento.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });

  describe('GET /eventos/client/:clientId', () => {
    test('should get all eventos for a client', async () => {
      const response = await request(app.server).get(
        `/eventos/client/${client.id}`
      );

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    afterEach(async () => {
      await prisma.evento.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });

  describe('PUT /eventos/:id', () => {
    let evento: any;

    beforeEach(async () => {
      evento = await prisma.evento.create({
        data: {
          clientId: client.id,
          tipo: 'call',
          valor: 200.0,
          frequencia: 'weekly',
        },
      });
    });

    test('should update an evento', async () => {
      const updatedData = {
        tipo: 'Updated follow-up call',
      };

      const response = await request(app.server)
        .put(`/eventos/${evento.id}`)
        .send(updatedData);

      expect(response.statusCode).toBe(200);
      expect(response.body.tipo).toBe('Updated follow-up call');
    });

    afterEach(async () => {
      await prisma.evento.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });

  describe('DELETE /eventos/:id', () => {
    let evento: any;

    beforeEach(async () => {
      evento = await prisma.evento.create({
        data: {
          clientId: client.id,
          tipo: 'email',
          valor: 50.0,
          frequencia: 'daily',
        },
      });
    });

    test('should delete an evento', async () => {
      const response = await request(app.server).delete(`/eventos/${evento.id}`);

      expect(response.statusCode).toBe(204);
    });

    afterEach(async () => {
      await prisma.evento.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });
});
