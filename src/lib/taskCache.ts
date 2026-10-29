import type { RoomTask } from "./types";

// Pure helpers for the ["room-tasks", roomId] cache. They never mutate their input,
// and return the SAME array when nothing changed so React Query skips a re-render.

export const sortTasks = (tasks: RoomTask[]): RoomTask[] =>
    [...tasks].sort(
        (a, b) =>
            a.position - b.position ||
            Date.parse(a.created_at) - Date.parse(b.created_at),
    );

export const tasksOf = (tasks: RoomTask[], userId: string | undefined): RoomTask[] =>
    sortTasks(tasks.filter((t) => t.user_id === userId));

export const progressOf = (tasks: RoomTask[]) => ({
    done: tasks.filter((t) => t.done).length,
    total: tasks.length,
});

export function upsertTask(
    list: RoomTask[] | undefined,
    task: RoomTask,
): RoomTask[] {
    const base = list ?? [];
    return base.some((t) => t.id === task.id)
        ? base.map((t) => (t.id === task.id ? task : t))
        : [...base, task];
}

export function patchTask(
    list: RoomTask[] | undefined,
    id: string,
    patch: Partial<RoomTask>,
): RoomTask[] | undefined {
    if (!list || !list.some((t) => t.id === id)) return list;
    return list.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

export function removeTask(
    list: RoomTask[] | undefined,
    id: string,
): RoomTask[] | undefined {
    if (!list || !list.some((t) => t.id === id)) return list;
    return list.filter((t) => t.id !== id);
}
