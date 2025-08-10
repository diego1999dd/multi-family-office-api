const { buildApp } = require("../server");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
import { FastifyInstance } from "fastify";

describe("Auth Routes", () => {
  let server: FastifyInstance;
  let prisma: InstanceType<typeof PrismaClient>;

  beforeAll(async () => {
    server = await buildApp();
    await server.ready();
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          role: "ADVISOR",
        },
      });
      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload).message).toBe(
        "User created successfully."
      );
    });

    it("should return 400 if user already exists", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      await prisma.user.create({
        data: {
          name: "Existing User",
          email: "test@example.com",
          password: hashedPassword,
          role: "ADVISOR",
        },
      });
      const response = await server.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          role: "ADVISOR",
        },
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).message).toBe("User already exists.");
    });

    it("should return 400 for invalid input", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Test User",
        },
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).message).toBe("Invalid input.");
    });
  });

  describe("POST /auth/login", () => {
    it("should login successfully and return a token", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      await prisma.user.create({
        data: {
          name: "Test User",
          email: "test@example.com",
          password: hashedPassword,
          role: "ADVISOR",
        },
      });
      const response = await server.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "test@example.com",
          password: "password123",
        },
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toHaveProperty("token");
    });
  });
});
