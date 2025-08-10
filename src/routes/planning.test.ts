import request from 'supertest';
import { buildApp } from '../server';
import { FastifyInstance } from 'fastify';

describe('Planning API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /planning', () => {
    test('should calculate alignment percentage and category correctly for green category', async () => {
      const planningData = {
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
        .post('/planning')
        .send(planningData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        alignmentPercentage: 80,
        category: 'green',
      });
    });

    test('should calculate alignment percentage and category correctly for yellow category', async () => {
      const planningData = {
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
        .post('/planning')
        .send(planningData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        alignmentPercentage: 50,
        category: 'yellow',
      });
    });

    test('should calculate alignment percentage and category correctly for red category', async () => {
      const planningData = {
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
        .post('/planning')
        .send(planningData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        alignmentPercentage: 30,
        category: 'red',
      });
    });

    test('should return 400 for invalid input (missing totalPatrimony)', async () => {
      const planningData = {
        // totalPatrimony: 100000,
        goals: [
          { targetValue: 50000, targetDate: '2025-12-31T00:00:00.000Z' },
        ],
        wallet: {
          classes: 'stocks',
          percentages: 100,
        },
      };

      const response = await request(app.server)
        .post('/planning')
        .send(planningData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    test('should return 400 for invalid input (invalid targetDate format)', async () => {
      const planningData = {
        totalPatrimony: 100000,
        goals: [
          { targetValue: 50000, targetDate: 'invalid-date' },
        ],
        wallet: {
          classes: 'stocks',
          percentages: 100,
        },
      };

      const response = await request(app.server)
        .post('/planning')
        .send(planningData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    test('should handle zero totalPatrimony gracefully', async () => {
      const planningData = {
        totalPatrimony: 0,
        goals: [
          { targetValue: 50000, targetDate: '2025-12-31T00:00:00.000Z' },
        ],
        wallet: {
          classes: 'stocks',
          percentages: 100,
        },
      };

      const response = await request(app.server)
        .post('/planning')
        .send(planningData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        alignmentPercentage: null,
        category: 'green',
      });
    });
  });
});
