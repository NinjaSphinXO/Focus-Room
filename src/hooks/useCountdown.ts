import { useEffect, useState } from "react";
import type { RoomTimer } from "@/lib/types";

// Returns remaining ms. Always derived from timestamps, never decremented.
export function useCountdown(timer: RoomTimer | undefined, offsetMs: number) {
    const [now, setNow] = useState(() => Date.now());
    const isRunning = timer?.status === "running";

    useEffect(() => {
        if (!isRunning) return;

        const sync = () => setNow(Date.now());
        const id = setInterval(sync, 250);
        // Tab was hidden (browser throttled the interval): refresh right away
        document.addEventListener("visibilitychange", sync);

        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", sync);
        };
    }, [isRunning]);

    if (!timer) return 0;

    if (timer.status === "running" && timer.ends_at) {
        const left = Date.parse(timer.ends_at) - (now + offsetMs);
        // remaining_seconds is untouched while running, so it is the upper bound.
        // Stops a stale `now` from showing too much time for one frame.
        return Math.min(timer.remaining_seconds * 1000, Math.max(0, left));
    }

    return timer.remaining_seconds * 1000;
}