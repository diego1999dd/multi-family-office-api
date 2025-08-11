import request from 'supertest';
import { buildApp } from '../server'; // Changed import
import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify'; // Import FastifyInstance type

const prisma = new PrismaClient();

describe('Eventos API', () => {
  let app: FastifyInstance; // Declare app variable
  let createdClientId: string;
  let createdEventId: string;

  beforeAll(async () => {
    app = await buildApp(); // Initialize app

    // Create a client for testing
    const client = await prisma.client.create({
      data: {
        name: 'Test Client',
        email: 'test.client@example.com',
        age: 30,
        status: 'Active',
        // Removed phone, address, birthDate
      },
    });
    createdClientId = client.id;

    // Create an event directly in the database for testing other routes
    const event = await prisma.eventos.create({
      data: {
        tipo: 'Meeting', // Changed from title
        valor: 100.00, // Added valor
        frequencia: 'Monthly', // Added frequencia
        // Removed description, date, location, type, priority
      },
    });
    createdEventId = event.id;
  });

  afterAll(async () => {
    // Clean up the created event and client after all tests are done
    await prisma.eventos.deleteMany({
      where: {
        id: createdEventId, // Changed to delete by id, as clientId is not in Eventos model
      },
    });
    await prisma.client.delete({
      where: {
        id: createdClientId,
      },
    });
    await prisma.$disconnect();
    await app.close(); // Close the Fastify app
  });

  describe('POST /eventos', () => {
    it('should create a new event successfully and return 201', async () => {
      const newEvent = {
        tipo: 'Workshop',
        valor: 250.00,
        frequencia: 'Weekly',
        // Removed other fields
      };

      const response = await request(app.server) // Use app.server for supertest
        .post('/eventos')
        .send(newEvent);

      expect(response.statusCode).toEqual(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.tipo).toEqual(newEvent.tipo);
      expect(response.body.valor).toEqual(newEvent.valor);
      expect(response.body.frequencia).toEqual(newEvent.frequencia);
    });

    it('should return 400 if required fields are missing', async () => {
      const invalidEvent = {
        valor: 50.00,
        frequencia: 'Daily',
        // Missing 'tipo'
      };

      const response = await request(app.server) // Use app.server for supertest
        .post('/eventos')
        .send(invalidEvent);

      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /eventos', () => {
    it('should return all events', async () => {
      const response = await request(app.server).get('/eventos'); // Use app.server

      expect(response.statusCode).toEqual(200);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.some((e: any) => e.id === createdEventId)).toBeTruthy();
    });
  });

  describe('PUT /eventos/:id', () => {
    it('should update an existing event', async () => {
      const updatedData = {
        tipo: 'Updated Meeting',
        valor: 150.00,
        frequencia: 'Bi-Weekly',
      };

      const response = await request(app.server) // Use app.server
        .put(`/eventos/${createdEventId}`)
        .send(updatedData);

      expect(response.statusCode).toEqual(200);
      expect(response.body.id).toEqual(createdEventId);
      expect(response.body.tipo).toEqual(updatedData.tipo);
      expect(response.body.valor).toEqual(updatedData.valor);
      expect(response.body.frequencia).toEqual(updatedData.frequencia);
    });

    it('should return 404 if event to update is not found', async () => {
      const nonExistentId = 'non-existent-id';
      const updatedData = {
        tipo: 'Attempt to update non-existent',
      };

      const response = await request(app.server) // Use app.server
        .put(`/eventos/${nonExistentId}`)
        .send(updatedData);

      expect(response.statusCode).toEqual(404);
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdateData = {
        tipo: '', // Invalid tipo
      };

      const response = await request(app.server) // Use app.server
        .put(`/eventos/${createdEventId}`)
        .send(invalidUpdateData);

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('DELETE /eventos/:id', () => {
    it('should delete an event', async () => {
      const response = await request(app.server).delete(`/eventos/${createdEventId}`); // Use app.server

      expect(response.statusCode).toEqual(204);

      // Verify that the event is actually deleted
      const getResponse = await request(app.server).get(`/eventos/${createdEventId}`); // Use app.server
      expect(getResponse.statusCode).toEqual(404);
    });

    it('should return 404 if event to delete is not found', async () => {
      const nonExistentId = 'another-non-existent-id';
      const response = await request(app.server).delete(`/eventos/${nonExistentId}`); // Use app.server

      expect(response.statusCode).toEqual(404);
    });
  });
});