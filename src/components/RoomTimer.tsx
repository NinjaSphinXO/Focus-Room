import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { recordFocusSession } from "@/api/stats";
import {
    roomTimerKey,
    useRoomTimer,
    useServerOffset,
} from "@/hooks/useRoomTimer";
import { useCountdown } from "@/hooks/useCountdown";
import { errorText } from "@/lib/errorText";
import { focusSessionsKey } from "@/lib/queryKeys";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const formatTime = (ms: number) => {
    const total = Math.ceil(ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const RoomTimer = ({ roomId, isHost }: { roomId: string; isHost: boolean }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const timerQuery = useRoomTimer(roomId);
    const offsetMs = useServerOffset();
    const timer = timerQuery.data;
    const remainingMs = useCountdown(timer, offsetMs);
    const display = formatTime(remainingMs);

    // Server owns the timestamps, so no optimistic update: use the returned row
    const onSuccess = (row: unknown) =>
        queryClient.setQueryData(roomTimerKey(roomId), row);

    const startMutation = useMutation({ mutationFn: () => startTimer(roomId), onSuccess });
    const pauseMutation = useMutation({ mutationFn: () => pauseTimer(roomId), onSuccess });
    const setMutation = useMutation({
        mutationFn: ({ phase, seconds }: { phase: TimerPhase; seconds: number }) =>
            setTimer(roomId, phase, seconds),
        onSuccess,
    });

    // ---- Phase 4: when a FOCUS timer reaches 0:00, every member records their own session.
    // The server checks the timer row and decides the length. A unique index stops duplicates.
    const recordMutation = useMutation({
        mutationFn: () => recordFocusSession(roomId),
        // our clock can be a hair ahead of the server: try again a couple of times
        retry: (count, error) =>
            count < 2 && error.message === "errors.sessionNotReady",
        retryDelay: 1500,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: focusSessionsKey });
        },
    });

    const finishedEndsAt =
        timer?.status === "running" &&
        timer.phase === "focus" &&
        remainingMs === 0
            ? timer.ends_at
            : null;
    const recordedFor = useRef<string | null>(null);

    useEffect(() => {
        if (!finishedEndsAt || recordedFor.current === finishedEndsAt) return;
        recordedFor.current = finishedEndsAt; // once per finished session, even if the effect reruns
        recordMutation.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finishedEndsAt]);

    // Show the countdown in the browser tab title while running
    const isTicking = timer?.status === "running" && remainingMs > 0;
    useEffect(() => {
        if (!isTicking) return;
        const original = document.title;
        document.title = `${display} · ${t("common.appName")}`;
        return () => {
            document.title = original;
        };
    }, [isTicking, display, t]);

    // ── States (all hooks are above this line) ──
    if (timerQuery.isPending) {
        return (
            <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                    {t("timer.loading")}
                </CardContent>
            </Card>
        );
    }

    if (timerQuery.isError) {
        return (
            <Card>
                <CardContent className="pt-6 text-sm text-destructive">
                    {errorText(t, timerQuery.error)}
                </CardContent>
            </Card>
        );
    }

    if (!timer) return null;

    const isRunning = timer.status === "running";
    const isFinished = isRunning && remainingMs === 0;
    const phaseLabel = timer.phase === "focus" ? t("timer.focus") : t("timer.break");
    const statusText = isFinished
        ? t("timer.statusFinished")
        : isRunning
          ? t("timer.statusRunning")
          : timer.status === "paused"
            ? t("timer.statusPaused")
            : t("timer.statusIdle");

    const isBusy =
        startMutation.isPending || pauseMutation.isPending || setMutation.isPending;
    const actionError =
        startMutation.error ?? pauseMutation.error ?? setMutation.error;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t("timer.title")}</CardTitle>
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
                    aria-label={t("timer.clockLabel", { phase: phaseLabel })}
                    dir="ltr"
                    className="text-center font-mono text-5xl font-bold tabular-nums"
                >
                    {display}
                </div>

                {/* Announce state changes only, not every second */}
                <p className="sr-only" aria-live="polite">
                    {phaseLabel}: {statusText}
                </p>

                {recordMutation.isSuccess && (
                    <p role="status" className="text-center text-sm text-emerald-600">
                        {t("timer.sessionSaved")}
                    </p>
                )}

                {actionError && (
                    <p role="alert" className="text-center text-sm font-medium text-destructive">
                        {errorText(t, actionError)}
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
                                    <Pause className="h-4 w-4" aria-hidden="true" /> {t("timer.pause")}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => startMutation.mutate()}
                                    disabled={isBusy || remainingMs === 0}
                                    className="gap-2"
                                >
                                    <Play className="h-4 w-4" aria-hidden="true" />
                                    {timer.status === "paused" ? t("timer.resume") : t("timer.start")}
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
                                <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t("timer.reset")}
                            </Button>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button
                                variant={timer.phase === "focus" ? "secondary" : "outline"}
                                size="sm"
                                disabled={isBusy}
                                onClick={() =>
                                    setMutation.mutate({ phase: "focus", seconds: FOCUS_SECONDS })
                                }
                            >
                                {t("timer.presetFocus")}
                            </Button>
                            <Button
                                variant={timer.phase === "break" ? "secondary" : "outline"}
                                size="sm"
                                disabled={isBusy}
                                onClick={() =>
                                    setMutation.mutate({ phase: "break", seconds: BREAK_SECONDS })
                                }
                            >
                                {t("timer.presetBreak")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-sm text-muted-foreground">
                        {t("timer.hostControls")}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default RoomTimer;
