import { z } from "zod";

// Messages are translation keys. UI translates them with t(error.message).
export const loginSchema = z.object({
    email: z.email({ message: "validation.emailInvalid" }),
    password: z.string().min(1, { message: "validation.passwordRequired" }),
});

export const registerSchema = z
    .object({
        displayName: z
            .string()
            .trim()
            .min(3, { message: "validation.displayNameMin" })
            .max(30, { message: "validation.displayNameMax" }),
        email: z.email({ message: "validation.emailInvalid" }),
        password: z
            .string()
            .min(1, { message: "validation.passwordRequired" })
            .min(8, { message: "validation.passwordMin" }),
        confirmPassword: z
            .string()
            .min(1, { message: "validation.confirmRequired" }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "validation.passwordsMismatch",
        path: ["confirmPassword"],
    });

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
