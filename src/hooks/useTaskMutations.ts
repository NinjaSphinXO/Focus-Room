import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    addTask,
    deleteTask,
    updateTask,
    type NewTaskInput,
} from "@/api/tasks";
import { roomTasksKey, taskMutationKey } from "@/lib/queryKeys";
import { patchTask, removeTask, upsertTask } from "@/lib/taskCache";
import type { RoomTask } from "@/lib/types";

type Context = { previous: RoomTask[] | undefined };
type Reorder = { updates: { id: string; position: number }[] };

// Optimistic mutations for the task list (same recipe as DevBoard, with two upgrades):
//  1. the client creates the row id, so the optimistic row IS the real row (no temp-id swap)
//  2. only the LAST in-flight mutation refetches, so quick clicks do not flicker
export function useTaskMutations(roomId: string, userId: string) {
    const queryClient = useQueryClient();
    const key = roomTasksKey(roomId);
    const mutationKey = taskMutationKey(roomId);

    const begin = async (): Promise<Context> => {
        await queryClient.cancelQueries({ queryKey: key });
        return { previous: queryClient.getQueryData<RoomTask[]>(key) };
    };

    const rollback = (ctx: Context | undefined) =>
        queryClient.setQueryData(key, ctx?.previous);

    const settle = () => {
        // this mutation still counts as "mutating" inside onSettled, hence === 1
        if (queryClient.isMutating({ mutationKey }) === 1) {
            return queryClient.invalidateQueries({ queryKey: key });
        }
    };

    const add = useMutation({
        mutationKey,
        mutationFn: (task: NewTaskInput) => addTask(task),
        onMutate: async (task) => {
            const ctx = await begin();
            queryClient.setQueryData<RoomTask[]>(key, (old) =>
                upsertTask(old, {
                    ...task,
                    user_id: userId,
                    done: false,
                    created_at: new Date().toISOString(),
                }),
            );
            return ctx;
        },
        onError: (_e, _v, ctx) => rollback(ctx),
        onSettled: settle,
    });

    const toggle = useMutation({
        mutationKey,
        mutationFn: ({ id, done }: { id: string; done: boolean }) =>
            updateTask(id, { done }),
        onMutate: async ({ id, done }) => {
            const ctx = await begin();
            queryClient.setQueryData<RoomTask[]>(key, (old) =>
                patchTask(old, id, { done }),
            );
            return ctx;
        },
        onError: (_e, _v, ctx) => rollback(ctx),
        onSettled: settle,
    });

    const remove = useMutation({
        mutationKey,
        mutationFn: (id: string) => deleteTask(id),
        onMutate: async (id) => {
            const ctx = await begin();
            queryClient.setQueryData<RoomTask[]>(key, (old) =>
                removeTask(old, id),
            );
            return ctx;
        },
        onError: (_e, _v, ctx) => rollback(ctx),
        onSettled: settle,
    });

    // One row for a normal drag, every row when positions had to be renumbered
    const reorder = useMutation({
        mutationKey,
        mutationFn: ({ updates }: Reorder) =>
            Promise.all(updates.map((u) => updateTask(u.id, { position: u.position }))),
        onMutate: async ({ updates }) => {
            const ctx = await begin();
            queryClient.setQueryData<RoomTask[]>(key, (old) =>
                updates.reduce<RoomTask[] | undefined>(
                    (list, u) => patchTask(list, u.id, { position: u.position }),
                    old,
                ),
            );
            return ctx;
        },
        onError: (_e, _v, ctx) => rollback(ctx),
        onSettled: settle,
    });

    return { add, toggle, remove, reorder };
}
