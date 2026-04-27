const request = require("supertest");
jest.mock("../db/db1");
const db = require("../db/db1");

const server = require("../server");
const app = server.app;

describe("Donations API", () => {

    test("Fails without amount", async () => {
        const res = await request(app).post("/api/donations").send({});
        expect(res.statusCode).toBe(400);
    });

    test("Success donation", async () => {
        db.query.mockResolvedValueOnce([{ insertId: 1 }]);

        const res = await request(app)
            .post("/api/donations")
            .send({ amount: 100 });

        expect(res.body.ok).toBe(true);
    });

});

afterAll(async () => {
  await db.end();
});