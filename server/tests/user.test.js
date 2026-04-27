const request = require("supertest");
jest.mock("../db/db1");
const db = require("../db/db1");

const server = require("../server");
const app = server.app;

describe("User API", () => {

    test("GET /api/me no email", async () => {
        const res = await request(app).get("/api/me");
        expect(res.body.name).toBe("Demo User");
    });

    test("GET /api/me user not found", async () => {
        db.query.mockResolvedValueOnce([[]]);

        const res = await request(app).get("/api/me?email=test@test.com");
        expect(res.statusCode).toBe(404);
    });

    test("PUT /api/me missing email", async () => {
        const res = await request(app).put("/api/me").send({});
        expect(res.statusCode).toBe(400);
    });

});

afterAll(async () => {
  await db.end();
});