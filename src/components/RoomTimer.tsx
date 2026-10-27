import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { pauseTimer, setTimer, startTimer, type TimerPhase } from "@/api/timer";
import {
    roomTimerKey,
    useRoomTimer,
    useServerOffset,
} from "@/hooks/useRoomTimer";
import { useCountdown } from "@/hooks/useCountdown";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const formatTime = (ms: number) => {
    const total = Math.ceil(ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const RoomTimer = ({ roomId, isHost }: { roomId: string; isHost: boolean }) => {
    const queryClient = useQueryClient();
    const timerQuery = useRoomTimer(roomId);
    const offsetMs = useServerOffset();
    const timer = timerQuery.data;
    const remainingMs = useCountdown(timer, offsetMs);
    const display = formatTime(remainingMs);

    // Server owns the timestamps, so no optimistic update: use the returned row
    const onSuccess = (row: unknown) =>
        queryClient.setQueryData(roomTimerKey(roomId), row);

    const startMutation = useMutation({
        mutationFn: () => startTimer(roomId),
        onSuccess,
    });
    const pauseMutation = useMutation({
        mutationFn: () => pauseTimer(roomId),
        onSuccess,
    });
    const setMutation = useMutation({
        mutationFn: ({
            phase,
            seconds,
        }: {
            phase: TimerPhase;
            seconds: number;
        }) => setTimer(roomId, phase, seconds),
        onSuccess,
    });

    // Show the countdown in the browser tab title while running
    const isTicking = timer?.status === "running" && remainingMs > 0;
    useEffect(() => {
        if (!isTicking) return;
        const original = document.title;
        document.title = `${display} · FocusRoom`;
        return () => {
            document.title = original;
        };
    }, [isTicking, display]);

    // ── States (all hooks are above this line) ──
    if (timerQuery.isPending) {
        return (
            <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                    Loading timer...
                </CardContent>
            </Card>
        );
    }

    if (timerQuery.isError) {
        return (
            <Card>
                <CardContent className="pt-6 text-sm text-destructive">
                    Error: {timerQuery.error.message}
                </CardContent>
            </Card>
        );
    }

    if (!timer) return null;

    const isRunning = timer.status === "running";
    const isFinished = isRunning && remainingMs === 0;
    const phaseLabel = timer.phase === "focus" ? "Focus" : "Break";
    const statusText = isFinished
        ? "Time's up"
        : isRunning
          ? "Running"
          : timer.status === "paused"
            ? "Paused"
            : "Not started";

    const isBusy =
        startMutation.isPending ||
        pauseMutation.isPending ||
        setMutation.isPending;
    const actionError =
        startMutation.error ?? pauseMutation.error ?? setMutation.error;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Timer</CardTitle>
                    <Badge variant={timer.phase === "focus" ? "default" : "secondary"}>
                        {phaseLabel}
                    </Badge>
                </div>
                <CardDescription>{statusText}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div
                    role="timer"
                    aria-live="off"
                    aria-label={`${phaseLabel} timer`}
                    className="text-center font-mono text-5xl font-bold tabular-nums"
                >
                    {display}
                </div>

                {/* Announce state changes only, not every second */}
                <p className="sr-only" aria-live="polite">
                    {phaseLabel} timer: {statusText}
                </p>

                {actionError && (
                    <p
                        role="alert"
                        className="text-center text-sm font-medium text-destructive"
                    >
                        {actionError.message}
                    </p>
                )}

                {isHost ? (
                    <div className="space-y-3">
                        <div className="flex flex-wrap justify-center gap-2">
                            {isRunning && !isFinished ? (
                                <Button
                                    onClick={() => pauseMutation.mutate()}
                                    disabled={isBusy}
                                    className="gap-2"
                                >
                                    <Pause className="h-4 w-4" /> Pause
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => startMutation.mutate()}
                                    disabled={isBusy || remainingMs === 0}
                                    className="gap-2"
                                >
                                    <Play className="h-4 w-4" />
                                    {timer.status === "paused"
                                        ? "Resume"
                                        : "Start"}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setMutation.mutate({
                                        phase: timer.phase as TimerPhase,
                                        seconds: timer.duration_seconds,
                                    })
                                }
                                disabled={isBusy}
                                className="gap-2"
                            >
                                <RotateCcw className="h-4 w-4" /> Reset
                            </Button>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button
                                variant={
                                    timer.phase === "focus"
                                        ? "secondary"
                                        : "outline"
                                }
                                size="sm"
                                disabled={isBusy}
                                onClick={() =>
                                    setMutation.mutate({
                                        phase: "focus",
                                        seconds: FOCUS_SECONDS,
                                    })
                                }
                            >
                                Focus 25m
                            </Button>
                            <Button
                                variant={
                                    timer.phase === "break"
                                        ? "secondary"
                                        : "outline"
                                }
                                size="sm"
                                disabled={isBusy}
                                onClick={() =>
                                    setMutation.mutate({
                                        phase: "break",
                                        seconds: BREAK_SECONDS,
                                    })
                                }
                            >
                                Break 5m
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-sm text-muted-foreground">
                        The host controls the timer.
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default RoomTimer;