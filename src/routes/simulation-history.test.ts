import request from 'supertest';
import { buildApp } from '../server';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Simulation History API', () => {
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

  

  describe('POST /simulation-history', () => {
    test('should create a new simulation history entry', async () => {
      const simulationData = {
        clientId: client.id,
        simulationDate: new Date().toISOString(),
        parameters: { initialWealth: 10000, monthlyContribution: 100, monthlyGrowthRate: 0.01, projectionMonths: 12 },
        results: { wealthCurve: [10000, 10100, 10201] },
      };

      const response = await request(app.server)
        .post('/simulation-history')
        .send(simulationData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.clientId).toBe(client.id);
    });

    test('should return 400 for invalid input', async () => {
      const invalidSimulationData = {
        clientId: client.id,
        parameters: { initialWealth: 'invalid', monthlyContribution: 100, monthlyGrowthRate: 0.01, projectionMonths: 12 },
        results: { wealthCurve: [10000, 'invalid', 10201] },
      };

      const response = await request(app.server)
        .post('/simulation-history')
        .send(invalidSimulationData);

      expect(response.statusCode).toBe(400);
    });

    afterEach(async () => {
      await prisma.simulationHistory.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });

  describe('GET /simulation-history/client/:clientId', () => {
    test('should get all simulation history entries for a client', async () => {
      await prisma.simulationHistory.create({
        data: {
          clientId: client.id,
          parameters: { initialWealth: 10000, monthlyContribution: 100, monthlyGrowthRate: 0.01, projectionMonths: 12 },
          results: { wealthCurve: [10000, 10100, 10201] },
        },
      });

      const response = await request(app.server).get(
        `/simulation-history/client/${client.id}`
      );

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should return an empty array if no entries exist', async () => {
      const response = await request(app.server).get(
        `/simulation-history/client/${client.id}`
      );

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([]);
    });

    afterEach(async () => {
      await prisma.simulationHistory.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });

  describe('GET /simulation-history/:id', () => {
    test('should return a single simulation history entry by ID', async () => {
      const simulation = await prisma.simulationHistory.create({
        data: {
          clientId: client.id,
          parameters: { initialWealth: 10000, monthlyContribution: 100, monthlyGrowthRate: 0.01, projectionMonths: 12 },
          results: { wealthCurve: [10000, 10100, 10201] },
        },
      });

      const response = await request(app.server).get(
        `/simulation-history/${simulation.id}`
      );

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('id', simulation.id);
    });

    test('should return 404 if entry not found', async () => {
      const nonExistentId = 'some-non-existent-id';
      const response = await request(app.server).get(
        `/simulation-history/${nonExistentId}`
      );

      expect(response.statusCode).toBe(404);
    });

    afterEach(async () => {
      await prisma.simulationHistory.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });

  describe('PUT /simulation-history/:id', () => {
    let simulation: any;

    beforeEach(async () => {
      simulation = await prisma.simulationHistory.create({
        data: {
          clientId: client.id,
          simulationDate: new Date().toISOString(),
          parameters: { initialWealth: 10000, monthlyContribution: 100, monthlyGrowthRate: 0.01, projectionMonths: 12 },
          results: { wealthCurve: [10000, 10100, 10201] },
        },
      });
    });
    test('should update a simulation history entry', async () => {
      const simulation = await prisma.simulationHistory.create({
        data: {
          clientId: client.id,
          parameters: { initialWealth: 10000, monthlyContribution: 100, monthlyGrowthRate: 0.01, projectionMonths: 12 },
          results: { wealthCurve: [10000, 10100, 10201] },
        },
      });

      const updatedData = {
        results: { wealthCurve: [10000, 10100, 10201, 10303] },
      };

      const response = await request(app.server)
        .put(`/simulation-history/${simulation.id}`)
        .send(updatedData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('results.wealthCurve', updatedData.results.wealthCurve);
    });

    test('should return 404 if entry not found', async () => {
      const nonExistentId = 'some-non-existent-id';
      const response = await request(app.server)
        .put(`/simulation-history/${nonExistentId}`)
        .send({ results: { wealthCurve: [] } });

      expect(response.statusCode).toBe(404);
    });

    afterEach(async () => {
      await prisma.simulationHistory.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });

  describe('DELETE /simulation-history/:id', () => {
    let simulation: any;

    beforeEach(async () => {
      simulation = await prisma.simulationHistory.create({
        data: {
          clientId: client.id,
          simulationDate: new Date().toISOString(),
          parameters: { initialWealth: 10000, monthlyContribution: 100, monthlyGrowthRate: 0.01, projectionMonths: 12 },
          results: { wealthCurve: [10000, 10100, 10201] },
        },
      });
    });
    test('should delete a simulation history entry', async () => {
      const simulation = await prisma.simulationHistory.create({
        data: {
          clientId: client.id,
          parameters: { initialWealth: 10000, monthlyContribution: 100, monthlyGrowthRate: 0.01, projectionMonths: 12 },
          results: { wealthCurve: [10000, 10100, 10201] },
        },
      });

      const response = await request(app.server).delete(
        `/simulation-history/${simulation.id}`
      );

      expect(response.statusCode).toBe(204);
    });

    test('should return 404 if entry not found', async () => {
      const nonExistentId = 'some-non-existent-id';
      const response = await request(app.server).delete(
        `/simulation-history/${nonExistentId}`
      );

      expect(response.statusCode).toBe(404);
    });

    afterEach(async () => {
      await prisma.simulationHistory.deleteMany({});
      await prisma.client.deleteMany({});
    });
  });
});
