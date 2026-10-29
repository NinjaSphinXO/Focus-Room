import { z } from "zod";

// Messages are translation keys. UI translates them with t(error.message).
export const createRoomSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, { message: "validation.roomNameMin" })
        .max(50, { message: "validation.roomNameMax" }),
});

export const joinRoomSchema = z.object({
    code: z
        .string()
        .trim()
        .length(6, { message: "validation.roomCodeLength" })
        .regex(/^[A-Za-z0-9]+$/, { message: "validation.roomCodeChars" }),
});

export type CreateRoomSchema = z.infer<typeof createRoomSchema>;
export type JoinRoomSchema = z.infer<typeof joinRoomSchema>;
