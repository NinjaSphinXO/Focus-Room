import { describe, expect, it } from "vitest";
import {
    patchTask,
    progressOf,
    removeTask,
    sortTasks,
    tasksOf,
    upsertTask,
} from "./taskCache";
import type { RoomTask } from "./types";

const task = (over: Partial<RoomTask> = {}): RoomTask => ({
    id: "t1",
    room_id: "r1",
    user_id: "u1",
    title: "Task",
    done: false,
    position: 1024,
    created_at: "2026-01-01T10:00:00.000Z",
    ...over,
});

describe("sortTasks", () => {
    it("orders by position and does not mutate the input", () => {
        const input = [task({ id: "b", position: 2 }), task({ id: "a", position: 1 })];
        expect(sortTasks(input).map((t) => t.id)).toEqual(["a", "b"]);
        expect(input.map((t) => t.id)).toEqual(["b", "a"]);
    });
    it("breaks position ties by creation time", () => {
        const older = task({ id: "old", position: 1, created_at: "2026-01-01T10:00:00.000Z" });
        const newer = task({ id: "new", position: 1, created_at: "2026-01-01T11:00:00.000Z" });
        expect(sortTasks([newer, older]).map((t) => t.id)).toEqual(["old", "new"]);
    });
});

describe("tasksOf / progressOf", () => {
    const all = [
        task({ id: "1", user_id: "me", done: true, position: 2 }),
        task({ id: "2", user_id: "me", done: false, position: 1 }),
        task({ id: "3", user_id: "other" }),
    ];
    it("keeps only one user's tasks, sorted", () => {
        expect(tasksOf(all, "me").map((t) => t.id)).toEqual(["2", "1"]);
    });
    it("counts done vs total", () => {
        expect(progressOf(tasksOf(all, "me"))).toEqual({ done: 1, total: 2 });
        expect(progressOf([])).toEqual({ done: 0, total: 0 });
    });
});

describe("upsertTask", () => {
    it("adds a new task", () => {
        expect(upsertTask([task({ id: "a" })], task({ id: "b" }))).toHaveLength(2);
    });
    it("works on an undefined cache", () => {
        expect(upsertTask(undefined, task({ id: "a" }))).toHaveLength(1);
    });
    it("replaces a task with the same id, so a realtime echo never duplicates it", () => {
        const result = upsertTask([task({ id: "a", done: false })], task({ id: "a", done: true }));
        expect(result).toHaveLength(1);
        expect(result[0].done).toBe(true);
    });
});

describe("patchTask / removeTask", () => {
    const list = [task({ id: "a" }), task({ id: "b" })];
    it("patches only the matching task", () => {
        const result = patchTask(list, "a", { done: true });
        expect(result?.find((t) => t.id === "a")?.done).toBe(true);
        expect(result?.find((t) => t.id === "b")?.done).toBe(false);
    });
    it("returns the SAME array when nothing matches (no pointless re-render)", () => {
        expect(patchTask(list, "zzz", { done: true })).toBe(list);
        expect(removeTask(list, "zzz")).toBe(list);
    });
    it("removes by id", () => {
        expect(removeTask(list, "a")?.map((t) => t.id)).toEqual(["b"]);
    });
    it("survives an undefined cache", () => {
        expect(patchTask(undefined, "a", {})).toBeUndefined();
        expect(removeTask(undefined, "a")).toBeUndefined();
    });
});
