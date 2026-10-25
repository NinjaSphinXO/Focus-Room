import { z } from "zod";

export const loginSchema = z.object({
    email: z.email({ message: "Enter a valid email" }),
    password: z.string().min(1, { message: "Password is required" }),
});

export const registerSchema = z
    .object({
        displayName: z
            .string()
            .trim()
            .min(3, { message: "Display name must be at least 3 characters" })
            .max(30, { message: "Display name must be at most 30 characters" }),
        email: z.email({ message: "Enter a valid email" }),
        password: z
            .string()
            .min(1, { message: "Password is required" })
            .min(8, { message: "Password must be at least 8 characters" }),
        confirmPassword: z
            .string()
            .min(1, { message: "Please confirm your password" }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;