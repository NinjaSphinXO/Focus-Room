import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Circle } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import TaskProgress from "@/components/TaskProgress";
import { useRoomTasks } from "@/hooks/useRoomTasks";
import { errorText } from "@/lib/errorText";
import { progressOf, tasksOf } from "@/lib/taskCache";
import type { RoomMember } from "@/api/rooms";

const MAX_VISIBLE = 5;

type Props = {
    roomId: string;
    currentUserId: string;
    hostId: string;
    members: RoomMember[];
};

// Read-only view of everyone else's tasks. Live: realtime keeps the cache fresh.
const TeamTasks = ({ roomId, currentUserId, hostId, members }: Props) => {
    const { t } = useTranslation();
    const tasksQuery = useRoomTasks(roomId);

    const others = useMemo(
        () =>
            members
                .filter((m) => m.user_id !== currentUserId)
                .sort((a, b) => {
                    if (a.user_id === hostId) return -1;
                    if (b.user_id === hostId) return 1;
                    return Date.parse(a.joined_at) - Date.parse(b.joined_at);
                }),
        [members, currentUserId, hostId],
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{t("tasks.teamTitle")}</CardTitle>
                <CardDescription>{t("tasks.teamDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
                {tasksQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
                ) : tasksQuery.isError ? (
                    <p className="text-sm text-destructive">
                        {errorText(t, tasksQuery.error)}
                    </p>
                ) : others.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("tasks.teamAlone")}</p>
                ) : (
                    <ul className="space-y-5">
                        {others.map((member) => {
                            const name = member.profiles?.display_name ?? t("common.unknown");
                            const theirs = tasksOf(tasksQuery.data, member.user_id);
                            const { done, total } = progressOf(theirs);
                            const visible = theirs.slice(0, MAX_VISIBLE);

                            return (
                                <li key={member.user_id} className="space-y-2">
                                    <p className="text-sm font-medium">{name}</p>
                                    {total === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                            {t("tasks.teamNone")}
                                        </p>
                                    ) : (
                                        <>
                                            <TaskProgress done={done} total={total} />
                                            <ul className="space-y-1">
                                                {visible.map((task) => (
                                                    <li
                                                        key={task.id}
                                                        className="flex items-start gap-2 text-sm"
                                                    >
                                                        {task.done ? (
                                                            <Check
                                                                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <Circle
                                                                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        <span className="sr-only">
                                                            {task.done
                                                                ? t("tasks.statusDone")
                                                                : t("tasks.statusOpen")}
                                                        </span>
                                                        <span
                                                            className={`min-w-0 break-words ${
                                                                task.done
                                                                    ? "text-muted-foreground line-through"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {task.title}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {theirs.length > MAX_VISIBLE && (
                                                <p className="text-xs text-muted-foreground">
                                                    {t("tasks.teamMore", {
                                                        count: theirs.length - MAX_VISIBLE,
                                                    })}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
};

export default TeamTasks;
