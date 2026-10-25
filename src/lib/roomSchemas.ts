import { z } from "zod";

export const createRoomSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, { message: "Name must be at least 3 characters" })
        .max(50, { message: "Name must be at most 50 characters" }),
});

export const joinRoomSchema = z.object({
    code: z
        .string()
        .trim()
        .length(6, { message: "Room code must be exactly 6 characters" })
        .regex(/^[A-Za-z0-9]+$/, { message: "Letters and numbers only" }),
});

export type CreateRoomSchema = z.infer<typeof createRoomSchema>;
export type JoinRoomSchema = z.infer<typeof joinRoomSchema>;