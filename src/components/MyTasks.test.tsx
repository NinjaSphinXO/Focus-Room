import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MyTasks from "./MyTasks";
import * as tasksApi from "@/api/tasks";
import type { RoomTask } from "@/lib/types";

// The api layer is mocked, so these tests never touch Supabase.
vi.mock("@/api/tasks", () => ({
    getRoomTasks: vi.fn(),
    addTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
}));

const api = vi.mocked(tasksApi);

const ROOM = "room-1";
const ME = "user-me";

const row = (over: Partial<RoomTask> = {}): RoomTask => ({
    id: "task-1",
    room_id: ROOM,
    user_id: ME,
    title: "Existing task",
    done: false,
    position: 1024,
    created_at: "2026-10-28T10:00:00.000Z",
    ...over,
});

const renderTasks = () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={client}>
            <MyTasks roomId={ROOM} userId={ME} />
        </QueryClientProvider>,
    );
};

// A promise we settle by hand, to freeze the app in the "request in flight" state
const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

beforeEach(() => {
    vi.resetAllMocks();
    api.getRoomTasks.mockResolvedValue([]);
});

describe("MyTasks", () => {
    it("shows the empty state", async () => {
        renderTasks();
        expect(await screen.findByText(/No tasks yet/i)).toBeInTheDocument();
    });

    it("validates before sending anything", async () => {
        const user = userEvent.setup();
        renderTasks();
        await screen.findByText(/No tasks yet/i);

        await user.click(screen.getByRole("button", { name: "Add" }));

        expect(await screen.findByText("Write a task first")).toBeInTheDocument();
        expect(api.addTask).not.toHaveBeenCalled();
    });

    it("shows a new task INSTANTLY, before the server answers (optimistic)", async () => {
        const user = userEvent.setup();
        const pending = deferred<RoomTask>();
        api.addTask.mockReturnValue(pending.promise);
        renderTasks();
        await screen.findByText(/No tasks yet/i);

        await user.type(screen.getByLabelText("New task"), "Write the tests");
        await user.click(screen.getByRole("button", { name: "Add" }));

        // the request is still pending, yet the row is already on screen
        expect(await screen.findByText("Write the tests")).toBeInTheDocument();
        expect(screen.getByLabelText("New task")).toHaveValue(""); // form cleared

        pending.resolve(row({ title: "Write the tests" }));
        await waitFor(() => expect(api.addTask).toHaveBeenCalledTimes(1));
        expect(screen.getByText("Write the tests")).toBeInTheDocument(); // still there
    });

    it("sends a client-made id and a position at the end of the list", async () => {
        const user = userEvent.setup();
        api.getRoomTasks.mockResolvedValue([row({ position: 2048 })]);
        api.addTask.mockResolvedValue(row({ id: "x" }));
        renderTasks();
        await screen.findByText("Existing task");

        await user.type(screen.getByLabelText("New task"), "Second");
        await user.click(screen.getByRole("button", { name: "Add" }));

        await waitFor(() => expect(api.addTask).toHaveBeenCalled());
        const sent = api.addTask.mock.calls[0][0];
        expect(sent.title).toBe("Second");
        expect(sent.room_id).toBe(ROOM);
        expect(sent.position).toBe(2048 + 1024);
        expect(sent.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("ROLLS BACK the optimistic task and shows an error when the request fails", async () => {
        const user = userEvent.setup();
        const pending = deferred<RoomTask>();
        api.addTask.mockReturnValue(pending.promise);
        renderTasks();
        await screen.findByText(/No tasks yet/i);

        await user.type(screen.getByLabelText("New task"), "Doomed task");
        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(await screen.findByText("Doomed task")).toBeInTheDocument();

        pending.reject(new Error("Network down"));

        await waitFor(() => expect(screen.queryByText("Doomed task")).not.toBeInTheDocument());
        expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
    });

    it("toggles done optimistically and rolls back on failure", async () => {
        const user = userEvent.setup();
        const pending = deferred<RoomTask>();
        api.getRoomTasks.mockResolvedValue([row()]);
        api.updateTask.mockReturnValue(pending.promise);
        renderTasks();

        const checkbox = await screen.findByRole("checkbox", { name: /Existing task/ });
        expect(checkbox).not.toBeChecked();

        await user.click(checkbox);
        await waitFor(() => expect(checkbox).toBeChecked()); // instant

        pending.reject(new Error("nope"));
        await waitFor(() => expect(checkbox).not.toBeChecked()); // rolled back
    });

    it("removes a task optimistically and puts it back on failure", async () => {
        const user = userEvent.setup();
        const pending = deferred<void>();
        api.getRoomTasks.mockResolvedValue([row()]);
        api.deleteTask.mockReturnValue(pending.promise);
        renderTasks();
        await screen.findByText("Existing task");

        await user.click(screen.getByRole("button", { name: /Delete "Existing task"/ }));
        await waitFor(() => expect(screen.queryByText("Existing task")).not.toBeInTheDocument());

        pending.reject(new Error("could not delete"));
        expect(await screen.findByText("Existing task")).toBeInTheDocument();
    });

    it("only shows MY tasks in this list", async () => {
        api.getRoomTasks.mockResolvedValue([
            row({ id: "1", title: "Mine" }),
            row({ id: "2", user_id: "someone-else", title: "Theirs" }),
        ]);
        renderTasks();
        expect(await screen.findByText("Mine")).toBeInTheDocument();
        expect(screen.queryByText("Theirs")).not.toBeInTheDocument();
    });

    it("every task has an accessible drag handle", async () => {
        api.getRoomTasks.mockResolvedValue([row()]);
        renderTasks();
        expect(await screen.findByRole("button", { name: /Move "Existing task"/ })).toBeInTheDocument();
    });
});
