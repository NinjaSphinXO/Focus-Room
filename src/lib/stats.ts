import { format, subDays } from "date-fns";

export type SessionLike = { ended_at: string; seconds: number };
export type DayStat = { day: string; minutes: number };

// Local-time day key, e.g. "2026-10-28". Streaks follow the user's own calendar days.
export const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

export const totalMinutes = (sessions: SessionLike[]) =>
    Math.round(sessions.reduce((sum, s) => sum + s.seconds, 0) / 60);

// Always returns `days` entries (oldest first), zero-filled, so the chart has no gaps.
export function minutesByDay(
    sessions: SessionLike[],
    days: number,
    today: Date = new Date(),
): DayStat[] {
    const seconds = new Map<string, number>();
    for (const s of sessions) {
        const key = dayKey(new Date(s.ended_at));
        seconds.set(key, (seconds.get(key) ?? 0) + s.seconds);
    }
    return Array.from({ length: days }, (_, i) => {
        const key = dayKey(subDays(today, days - 1 - i));
        return { day: key, minutes: Math.round((seconds.get(key) ?? 0) / 60) };
    });
}

// Consecutive days with at least one session. A streak stays alive if you did not
// focus yet TODAY but did yesterday.
export function computeStreak(
    sessions: SessionLike[],
    today: Date = new Date(),
): number {
    const days = new Set(sessions.map((s) => dayKey(new Date(s.ended_at))));
    let cursor = days.has(dayKey(today)) ? today : subDays(today, 1);
    let streak = 0;
    while (days.has(dayKey(cursor))) {
        streak++;
        cursor = subDays(cursor, 1);
    }
    return streak;
}

export const splitDuration = (totalMin: number) => ({
    h: Math.floor(totalMin / 60),
    m: totalMin % 60,
});
