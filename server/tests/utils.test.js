jest.mock("../db/db1");
const db = require("../db/db1");
const server = require("../server");

describe("Utility Functions", () => {

    test("normalizeEmail", () => {
        expect(server.normalizeEmail(" TEST@MAIL.COM ")).toBe("test@mail.com");
        expect(server.normalizeEmail(null)).toBe("");
    });

    test("cleanText", () => {
        expect(server.cleanText(" hello ")).toBe("hello");
        expect(server.cleanText("   ")).toBe(null);
    });

    test("cleanDate", () => {
        expect(server.cleanDate("2024-05-01")).toBe("2024-05-01");
        expect(server.cleanDate("invalid")).toBe(null);
    });

    test("serializeUser", () => {
        const user = {
            id: 1,
            fullname: "John Doe",
            email: "john@test.com"
        };

        const result = server.serializeUser(user);
        expect(result.name).toBe("John");
    });

    test("parseClassification", () => {
        const mock = { outputs: [{ top: "normal", confidence: 0.9 }] };
        const res = server.parseClassification(mock, "DR");
        expect(res.risk_label).toBe("Low");
    });

    test("parseGlaucoma", () => {
        const res = server.parseGlaucoma({});
        expect(res.risk_label).toBe("Low");
    });

});

afterAll(async () => {
  await db.end();
});