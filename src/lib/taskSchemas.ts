import { z } from "zod";

// Messages are translation keys. UI translates them with t(error.message).
export const taskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, { message: "validation.taskRequired" })
        .max(200, { message: "validation.taskMax" }),
});

export type TaskSchema = z.infer<typeof taskSchema>;
