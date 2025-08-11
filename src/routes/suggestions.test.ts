import request from 'supertest';
import { buildApp } from '../server';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Suggestions API', () => {
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

  afterEach(async () => {
    await prisma.client.deleteMany({});
  });

  describe('POST /suggestions', () => {
    test('should return green category suggestions when alignment is >= 80%', async () => {
      const suggestionData = {
        clientId: client.id,
        totalPatrimony: 100000,
        goals: [
          { targetValue: 50000, targetDate: '2025-12-31T00:00:00.000Z' },
          { targetValue: 30000, targetDate: '2026-12-31T00:00:00.000Z' },
        ],
        wallet: {
          classes: 'stocks',
          percentages: 100,
        },
      };

      const response = await request(app.server)
        .post('/suggestions')
        .send(suggestionData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'goals_review', description: expect.any(String) }),
      ]));
    });

    test('should return yellow category suggestions when alignment is >= 50% and < 80%', async () => {
      const suggestionData = {
        clientId: client.id,
        totalPatrimony: 100000,
        goals: [
          { targetValue: 30000, targetDate: '2025-12-31T00:00:00.000Z' },
          { targetValue: 20000, targetDate: '2026-12-31T00:00:00.000Z' },
        ],
        wallet: {
          classes: 'bonds',
          percentages: 100,
        },
      };

      const response = await request(app.server)
        .post('/suggestions')
        .send(suggestionData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'contribution', description: expect.any(String) }),
        expect.objectContaining({ type: 'rebalance', description: expect.any(String) }),
      ]));
    });

    test('should return red category suggestions when alignment is < 50%', async () => {
      const suggestionData = {
        clientId: client.id,
        totalPatrimony: 100000,
        goals: [
          { targetValue: 20000, targetDate: '2025-12-31T00:00:00.000Z' },
          { targetValue: 10000, targetDate: '2026-12-31T00:00:00.000Z' },
        ],
        wallet: {
          classes: 'real estate',
          percentages: 100,
        },
      };

      const response = await request(app.server)
        .post('/suggestions')
        .send(suggestionData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'contribution', description: expect.any(String) }),
        expect.objectContaining({ type: 'goals_review', description: expect.any(String) }),
      ]));
    });

    test('should return 400 for invalid input', async () => {
      const invalidSuggestionData = {
        clientId: client.id,
        totalPatrimony: 'invalid',
        goals: [],
        wallet: {},
      };

      const response = await request(app.server)
        .post('/suggestions')
        .send(invalidSuggestionData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});
