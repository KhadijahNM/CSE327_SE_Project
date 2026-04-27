const request = require("supertest");
jest.mock("../db/db1");
const db = require("../db/db1");

const server = require("../server");
const app = server.app;

describe("Scans API", () => {

    test("GET latest scan", async () => {
        db.query.mockResolvedValueOnce([[{ id: 1, email: "test@example.com" }]]);
        db.query.mockResolvedValueOnce([[{ disease: "DR" }]]);

        const res = await request(app).get("/api/scans/latest?email=test@example.com");
        expect(res.body.disease).toBe("DR");
    });

    test("DELETE scans missing email", async () => {
        const res = await request(app).delete("/api/scans");
        expect(res.statusCode).toBe(400);
    });

});

afterAll(async () => {
  await db.end();
});