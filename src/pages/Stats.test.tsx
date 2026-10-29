import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import type { Session } from "@supabase/supabase-js";
import Stats from "./Stats";
import * as statsApi from "@/api/stats";
import { store } from "@/store";
import { setSession } from "@/store/authSlice";

vi.mock("@/api/stats", () => ({
    getMySessions: vi.fn(),
    getMyDoneTaskCount: vi.fn(),
    recordFocusSession: vi.fn(),
}));

const api = vi.mocked(statsApi);

// Sessions at local noon, relative to "now", so the test never goes stale
const daysAgo = (n: number, seconds = 1500) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(12, 0, 0, 0);
    return {
        id: `s${n}`,
        user_id: "u1",
        room_id: "r1",
        created_at: d.toISOString(),
        ended_at: d.toISOString(),
        seconds,
    };
};

const renderStats = () => {
    store.dispatch(
        setSession({ user: { id: "u1", email: "o@x.co", user_metadata: { display_name: "Omar" } } } as unknown as Session),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <Provider store={store}>
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <Stats />
                </MemoryRouter>
            </QueryClientProvider>
        </Provider>,
    );
};

beforeEach(() => {
    vi.resetAllMocks();
});

describe("Stats page", () => {
    it("shows totals, streak and done tasks computed from real rows", async () => {
        api.getMySessions.mockResolvedValue([daysAgo(0), daysAgo(1), daysAgo(2)]);
        api.getMyDoneTaskCount.mockResolvedValue(7);
        renderStats();

        expect(await screen.findByText("1h 15m")).toBeInTheDocument(); // 3 x 25 min
        expect(screen.getByText("3 days")).toBeInTheDocument(); // streak
        expect(screen.getByText("7")).toBeInTheDocument(); // tasks done
    });

    it("shows the empty hint when there are no sessions", async () => {
        api.getMySessions.mockResolvedValue([]);
        api.getMyDoneTaskCount.mockResolvedValue(0);
        renderStats();
        expect(await screen.findByText(/No focus sessions yet/i)).toBeInTheDocument();
        expect(screen.getByText("0h 0m")).toBeInTheDocument();
    });

    it("gives the chart a screen-reader table with 14 rows", async () => {
        api.getMySessions.mockResolvedValue([daysAgo(0)]);
        api.getMyDoneTaskCount.mockResolvedValue(0);
        renderStats();
        await screen.findByText("0h 25m");
        const rows = screen.getAllByRole("row");
        expect(rows).toHaveLength(15); // header + 14 days
    });

    it("shows an error instead of crashing", async () => {
        api.getMySessions.mockRejectedValue(new Error("boom"));
        api.getMyDoneTaskCount.mockResolvedValue(0);
        renderStats();
        expect(await screen.findByRole("alert")).toHaveTextContent("boom");
    });
});
