import { describe, expect, it } from "vitest";
import {
    computeStreak,
    dayKey,
    minutesByDay,
    splitDuration,
    totalMinutes,
} from "./stats";

// Build sessions at local noon so timezone shifts can never move them to another day
const at = (y: number, m: number, d: number, seconds = 1500) => ({
    ended_at: new Date(y, m - 1, d, 12, 0, 0).toISOString(),
    seconds,
});
const TODAY = new Date(2026, 9, 28, 15, 0, 0); // 28 Oct 2026

describe("totalMinutes / splitDuration", () => {
    it("sums seconds into rounded minutes", () => {
        expect(totalMinutes([at(2026, 10, 1, 1500), at(2026, 10, 2, 300)])).toBe(30);
        expect(totalMinutes([])).toBe(0);
    });
    it("splits minutes into hours and minutes", () => {
        expect(splitDuration(125)).toEqual({ h: 2, m: 5 });
        expect(splitDuration(0)).toEqual({ h: 0, m: 0 });
    });
});

describe("minutesByDay", () => {
    it("returns exactly N days, oldest first, zero-filled, ending today", () => {
        const result = minutesByDay([at(2026, 10, 27, 1500)], 3, TODAY);
        expect(result.map((r) => r.day)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28"]);
        expect(result.map((r) => r.minutes)).toEqual([0, 25, 0]);
    });
    it("adds up several sessions on the same day", () => {
        const result = minutesByDay([at(2026, 10, 28, 1500), at(2026, 10, 28, 300)], 1, TODAY);
        expect(result[0].minutes).toBe(30);
    });
    it("ignores sessions outside the window", () => {
        const result = minutesByDay([at(2026, 9, 1)], 3, TODAY);
        expect(result.every((r) => r.minutes === 0)).toBe(true);
    });
});

describe("computeStreak", () => {
    it("is 0 with no sessions", () => {
        expect(computeStreak([], TODAY)).toBe(0);
    });
    it("counts consecutive days ending today", () => {
        const s = [at(2026, 10, 28), at(2026, 10, 27), at(2026, 10, 26)];
        expect(computeStreak(s, TODAY)).toBe(3);
    });
    it("stays alive when you have not focused YET today but did yesterday", () => {
        const s = [at(2026, 10, 27), at(2026, 10, 26)];
        expect(computeStreak(s, TODAY)).toBe(2);
    });
    it("is broken by a missed day", () => {
        const s = [at(2026, 10, 28), at(2026, 10, 26)];
        expect(computeStreak(s, TODAY)).toBe(1);
    });
    it("is 0 when the last session was 2+ days ago", () => {
        expect(computeStreak([at(2026, 10, 25)], TODAY)).toBe(0);
    });
    it("counts a day once however many sessions it has", () => {
        const s = [at(2026, 10, 28), at(2026, 10, 28), at(2026, 10, 27)];
        expect(computeStreak(s, TODAY)).toBe(2);
    });
    it("crosses a month boundary", () => {
        const today = new Date(2026, 10, 2, 9, 0, 0); // 2 Nov
        const s = [at(2026, 11, 2), at(2026, 11, 1), at(2026, 10, 31)];
        expect(computeStreak(s, today)).toBe(3);
    });
});

describe("dayKey", () => {
    it("formats local dates as yyyy-MM-dd", () => {
        expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    });
});
