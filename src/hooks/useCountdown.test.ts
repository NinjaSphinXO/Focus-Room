import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCountdown } from "./useCountdown";
import type { RoomTimer } from "@/lib/types";

const NOW = new Date("2026-10-28T12:00:00.000Z").getTime();

const timer = (over: Partial<RoomTimer> = {}): RoomTimer => ({
    room_id: "r1",
    phase: "focus",
    status: "idle",
    duration_seconds: 1500,
    remaining_seconds: 1500,
    ends_at: null,
    updated_at: new Date(NOW).toISOString(),
    ...over,
});

const running = (secondsLeft: number, over: Partial<RoomTimer> = {}) =>
    timer({
        status: "running",
        remaining_seconds: 1500,
        ends_at: new Date(NOW + secondsLeft * 1000).toISOString(),
        ...over,
    });

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});
afterEach(() => {
    vi.useRealTimers();
});

describe("useCountdown", () => {
    it("is 0 with no timer", () => {
        const { result } = renderHook(() => useCountdown(undefined, 0));
        expect(result.current).toBe(0);
    });

    it("shows the stored remaining time when idle or paused", () => {
        const idle = renderHook(() => useCountdown(timer(), 0));
        expect(idle.result.current).toBe(1500 * 1000);
        const paused = renderHook(() =>
            useCountdown(timer({ status: "paused", remaining_seconds: 400 }), 0),
        );
        expect(paused.result.current).toBe(400 * 1000);
    });

    it("counts down from ends_at as time passes (derived, not decremented)", () => {
        const { result } = renderHook(() => useCountdown(running(60), 0));
        expect(result.current).toBe(60_000);
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(result.current).toBe(50_000);
    });

    it("never goes below zero", () => {
        const { result } = renderHook(() => useCountdown(running(5), 0));
        act(() => {
            vi.advanceTimersByTime(30_000);
        });
        expect(result.current).toBe(0);
    });

    it("uses the server clock offset (client behind the server by 4s)", () => {
        // serverNow = clientNow + 4000, so 4 seconds less remain
        const { result } = renderHook(() => useCountdown(running(60), 4000));
        expect(result.current).toBe(56_000);
    });

    it("catches up when the tab was hidden and ticks were throttled", () => {
        const { result } = renderHook(() => useCountdown(running(60), 0));
        // time passes with NO interval ticks (hidden tab) ...
        vi.setSystemTime(NOW + 20_000);
        // ... then the tab becomes visible again
        act(() => {
            document.dispatchEvent(new Event("visibilitychange"));
        });
        expect(result.current).toBe(40_000);
    });

    it("stops ticking when the timer is not running", () => {
        const spy = vi.spyOn(globalThis, "setInterval");
        renderHook(() => useCountdown(timer(), 0));
        expect(spy).not.toHaveBeenCalled();
    });
});
