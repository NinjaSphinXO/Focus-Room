import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./authSchema";

const valid = {
    displayName: "Omar",
    email: "omar@example.com",
    password: "12345678",
    confirmPassword: "12345678",
};

const firstMessage = (result: ReturnType<typeof registerSchema.safeParse>) =>
    result.success ? undefined : result.error.issues[0]?.message;

describe("registerSchema", () => {
    it("accepts matching passwords (regression: refine was once inverted)", () => {
        expect(registerSchema.safeParse(valid).success).toBe(true);
    });
    it("rejects mismatched passwords and points at confirmPassword", () => {
        const result = registerSchema.safeParse({ ...valid, confirmPassword: "different1" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
            expect(result.error.issues[0].message).toBe("validation.passwordsMismatch");
        }
    });
    it("rejects a whitespace-only display name", () => {
        expect(firstMessage(registerSchema.safeParse({ ...valid, displayName: "     " }))).toBe(
            "validation.displayNameMin",
        );
    });
    it("rejects a short password", () => {
        const result = registerSchema.safeParse({ ...valid, password: "1234567", confirmPassword: "1234567" });
        expect(firstMessage(result)).toBe("validation.passwordMin");
    });
    it("says 'required' (not 'too short') for an empty password", () => {
        expect(firstMessage(registerSchema.safeParse({ ...valid, password: "" }))).toBe(
            "validation.passwordRequired",
        );
    });
    it("rejects a bad email", () => {
        expect(firstMessage(registerSchema.safeParse({ ...valid, email: "nope" }))).toBe(
            "validation.emailInvalid",
        );
    });
});

describe("loginSchema", () => {
    it("accepts a normal login", () => {
        expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    });
    it("rejects an empty password with a readable key", () => {
        const result = loginSchema.safeParse({ email: "a@b.co", password: "" });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues[0].message).toBe("validation.passwordRequired");
    });
});
