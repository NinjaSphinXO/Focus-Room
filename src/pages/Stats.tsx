import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { startOfDay, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppHeader from "@/components/AppHeader";
import FocusChart from "@/components/FocusChart";
import { getMyDoneTaskCount, getMySessions } from "@/api/stats";
import { errorText } from "@/lib/errorText";
import { doneTasksKey, focusSessionsKey } from "@/lib/queryKeys";
import {
    computeStreak,
    minutesByDay,
    splitDuration,
    totalMinutes,
} from "@/lib/stats";
import { useAppSelector } from "@/store/hooks";

const HISTORY_DAYS = 90;
const CHART_DAYS = 14;

const StatCard = ({ label, value }: { label: string; value: string }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
        </CardContent>
    </Card>
);

const Stats = () => {
    const { t } = useTranslation();
    const userId = useAppSelector((s) => s.auth.user?.id);

    const sessionsQuery = useQuery({
        queryKey: [...focusSessionsKey, userId],
        queryFn: () =>
            getMySessions(
                startOfDay(subDays(new Date(), HISTORY_DAYS - 1)).toISOString(),
            ),
        enabled: !!userId,
    });

    const doneQuery = useQuery({
        queryKey: doneTasksKey(userId),
        queryFn: () => getMyDoneTaskCount(userId!),
        enabled: !!userId,
    });

    const sessions = sessionsQuery.data ?? [];
    const { h, m } = splitDuration(totalMinutes(sessions));
    const streak = computeStreak(sessions);
    const chart = minutesByDay(sessions, CHART_DAYS);

    return (
        <>
            <AppHeader />
            <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto max-w-5xl space-y-6 p-6"
            >
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t("stats.title")}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t("stats.subtitle", { days: HISTORY_DAYS })}
                    </p>
                </div>

                {sessionsQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
                ) : sessionsQuery.isError ? (
                    <p role="alert" className="text-sm text-destructive">
                        {errorText(t, sessionsQuery.error)}
                    </p>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                label={t("stats.totalFocus")}
                                value={t("stats.hoursMinutes", { h, m })}
                            />
                            <StatCard
                                label={t("stats.sessions")}
                                value={String(sessions.length)}
                            />
                            <StatCard
                                label={t("stats.streak")}
                                value={t("stats.days", { count: streak })}
                            />
                            <StatCard
                                label={t("stats.tasksDone")}
                                value={doneQuery.isSuccess ? String(doneQuery.data) : "-"}
                            />
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {t("stats.chartTitle", { days: CHART_DAYS })}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {sessions.length === 0 && (
                                    <p className="mb-4 text-sm text-muted-foreground">
                                        {t("stats.empty")}
                                    </p>
                                )}
                                <FocusChart data={chart} />
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </>
    );
};

export default Stats;
