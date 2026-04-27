const request = require("supertest");
jest.mock("../db/db1");
const db = require("../db/db1");

const server = require("../server");
const app = server.app;

describe("Admin API", () => {

    test("No admin header", async () => {
        const res = await request(app).get("/api/admin/users");
        expect(res.statusCode).toBe(401);
    });

    test("Not admin", async () => {
        db.query.mockResolvedValueOnce([[{ role: "user" }]]);

        const res = await request(app)
            .get("/api/admin/users")
            .set("x-admin-email", "user@test.com");

        expect(res.statusCode).toBe(403);
    });

});

afterAll(async () => {
  await db.end();
});