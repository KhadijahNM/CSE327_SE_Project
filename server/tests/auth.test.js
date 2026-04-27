const request = require("supertest");
jest.mock("../db/db1");
const db = require("../db/db1");

jest.mock("bcrypt", () => ({
    hash: jest.fn().mockResolvedValue("hashed"),
    compare: jest.fn().mockResolvedValue(true)
}));

const server = require("../server");
const app = server.app;

describe("Auth API", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Signup fails missing data", async () => {
        const res = await request(app).post("/signup").send({});
        expect(res.statusCode).toBe(400);
    });

    test("Signup fails if email exists", async () => {
        db.query.mockResolvedValueOnce([[{ id: 1 }]]);

        const res = await request(app)
            .post("/signup")
            .send({ email: "test@test.com", password: "123" });

        expect(res.statusCode).toBe(400);
    });

    test("Signup success", async () => {
        db.query
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 1 }]);

        const res = await request(app)
            .post("/signup")
            .send({ email: "test@test.com", password: "123" });

        expect(res.body.ok).toBe(true);
    });

    test("Login user not found", async () => {
        db.query.mockResolvedValueOnce([[]]);

        const res = await request(app)
            .post("/login")
            .send({ email: "fake@test.com", password: "123" });

        expect(res.statusCode).toBe(401);
    });

});

afterAll(async () => {
  await db.end();
});