const request = require("supertest");
jest.mock("../db/db1");
const db = require("../db/db1");

const server = require("../server");
const app = server.app;

describe("API Endpoints", () => {

    test("GET /api/health", async () => {
        const res = await request(app).get("/api/health");
        expect(res.statusCode).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    test("GET / serves HTML", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
    });

});

afterAll(async () => {
  await db.end();
});