import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
    Users,
    LogOut,
    Trash2,
    ArrowLeft,
    Shield,
    Copy,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppHeader from "@/components/AppHeader";
import RoomTimer from "@/components/RoomTimer";
import MyTasks from "@/components/MyTasks";
import TeamTasks from "@/components/TeamTasks";
import { deleteRoom, getMembers, leaveRoom, roomByCode } from "@/api/rooms";
import { useAppSelector } from "@/store/hooks";
import { useRoomChannel } from "@/hooks/useRoomChannel";
import { useRoomTasks } from "@/hooks/useRoomTasks";
import { errorText } from "@/lib/errorText";
import { useDateLocale } from "@/lib/dateLocale";
import { roomMembersKey } from "@/lib/queryKeys";
import { progressOf, tasksOf } from "@/lib/taskCache";

const Room = () => {
    const { t } = useTranslation();
    const locale = useDateLocale();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { code } = useParams<{ code: string }>();
    const user = useAppSelector((s) => s.auth.user);
    const onlineUserIds = useAppSelector((s) => s.room.onlineUserIds);
    const channelStatus = useAppSelector((s) => s.room.channelStatus);

    const [copied, setCopied] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    // ── Queries ──
    const roomQuery = useQuery({
        queryKey: ["room", code],
        queryFn: () => roomByCode(code!),
        enabled: !!code,
    });

    const roomId = roomQuery.data?.id;

    const membersQuery = useQuery({
        queryKey: roomMembersKey(roomId),
        queryFn: () => getMembers(roomId!),
        enabled: !!roomId,
    });

    const tasksQuery = useRoomTasks(roomId);

    // ── Realtime: presence + timer + tasks on one channel (hook handles undefined ids) ──
    useRoomChannel(roomId, user?.id);

    // Someone online who is not in our members list = they just joined.
    // Refetch members once. After refetch they are known, so no loop.
    useEffect(() => {
        if (!roomId || !membersQuery.isSuccess) return;
        const knownIds = new Set(membersQuery.data.map((m) => m.user_id));
        if (onlineUserIds.some((id) => !knownIds.has(id))) {
            queryClient.invalidateQueries({ queryKey: roomMembersKey(roomId) });
        }
    }, [
        onlineUserIds,
        membersQuery.isSuccess,
        membersQuery.data,
        roomId,
        queryClient,
    ]);

    // ── Mutations (plain, not optimistic: user leaves this page anyway) ──
    const afterRoomGone = () => {
        navigate("/");
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        queryClient.removeQueries({ queryKey: ["room", code] });
        queryClient.removeQueries({ queryKey: ["room-members"] });
        queryClient.removeQueries({ queryKey: ["room-tasks"] });
    };

    const leaveMutation = useMutation({
        mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
            leaveRoom(roomId, userId),
        onSuccess: afterRoomGone,
    });

    const deleteMutation = useMutation({
        mutationFn: (roomId: string) => deleteRoom(roomId),
        onSuccess: afterRoomGone,
        onError: () => setDeleteOpen(false),
    });

    // ── Copy feedback reset ──
    useEffect(() => {
        if (!copied) return;
        const timeout = setTimeout(() => setCopied(false), 1000);
        return () => clearTimeout(timeout);
    }, [copied]);

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        } catch {
            // clipboard blocked (not https/localhost): ignore
        }
    };

    // ── Page states (all hooks are above this line) ──
    if (roomQuery.isPending) {
        return (
            <p role="status" className="p-6 text-sm text-muted-foreground">
                {t("room.loading")}
            </p>
        );
    }

    if (roomQuery.isError) {
        return (
            <p role="alert" className="p-6 text-sm text-destructive">
                {errorText(t, roomQuery.error)}
            </p>
        );
    }

    if (!roomQuery.data) {
        return (
            <>
                <AppHeader />
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="mx-auto max-w-md space-y-4 p-6 text-center"
                >
                    <h1 className="text-xl font-semibold">{t("room.notFoundTitle")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("room.notFoundBody")}
                    </p>
                    <Button render={<Link to="/" />}>{t("room.backToRooms")}</Button>
                </main>
            </>
        );
    }

    const room = roomQuery.data;
    const isHost = room.host_id === user?.id;
    const onlineSet = new Set(onlineUserIds);
    const isLive = channelStatus === "SUBSCRIBED";
    const statusText =
        channelStatus === "SUBSCRIBED"
            ? t("room.statusLive")
            : channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT"
              ? t("room.statusProblem")
              : t("room.statusConnecting");

    const members = [...(membersQuery.data ?? [])].sort((a, b) => {
        if (a.user_id === room.host_id) return -1;
        if (b.user_id === room.host_id) return 1;
        return (
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
    });

    const hostName =
        members.find((m) => m.user_id === room.host_id)?.profiles
            ?.display_name ?? t("common.unknown");

    const handleLeave = () => {
        if (user) leaveMutation.mutate({ roomId: room.id, userId: user.id });
    };

    const actionError = leaveMutation.error ?? deleteMutation.error;

    return (
        <>
            <AppHeader />
            <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto max-w-5xl space-y-6 p-6"
            >
                {/* Top bar */}
                <div className="flex items-center justify-between">
                    <Button
                        className="gap-2 ps-0 hover:bg-transparent"
                        variant="ghost"
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{" "}
                        {t("room.backToRooms")}
                    </Button>

                    <div className="flex items-center gap-2">
                        {!isHost && (
                            <Button
                                variant="outline"
                                className="gap-2 text-muted-foreground hover:text-foreground"
                                onClick={handleLeave}
                                disabled={leaveMutation.isPending}
                            >
                                <LogOut className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                                {leaveMutation.isPending
                                    ? t("room.leaving")
                                    : t("room.leave")}
                            </Button>
                        )}

                        {isHost && (
                            <Button
                                variant="destructive"
                                className="gap-2"
                                onClick={() => setDeleteOpen(true)}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />{" "}
                                {t("room.delete")}
                            </Button>
                        )}
                    </div>
                </div>

                {actionError && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                        {errorText(t, actionError)}
                    </p>
                )}

                {/* Delete confirm */}
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t("room.deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t("room.deleteDescription", { name: room.name })}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteMutation.isPending}
                                onClick={() => deleteMutation.mutate(room.id)}
                            >
                                {deleteMutation.isPending
                                    ? t("room.deleting")
                                    : t("room.delete")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <RoomTimer roomId={room.id} isHost={isHost} />

                {/* Info + members */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="h-fit md:col-span-1">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                                <Badge variant="secondary" className="font-mono text-xs" dir="ltr">
                                    {room.code}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => handleCopy(room.code)}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                                            {t("common.copied")}
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                                            {t("common.copy")}
                                        </>
                                    )}
                                </Button>
                            </div>
                            <CardTitle className="pt-2 text-xl">
                                <h1>{room.name}</h1>
                            </CardTitle>
                            <CardDescription>
                                {t("room.created", {
                                    date: format(new Date(room.created_at), "PP", { locale }),
                                })}
                            </CardDescription>
                        </CardHeader>
                        <Separator />
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">
                                    {t("room.hostedBy")}
                                </div>
                                <div className="text-sm">{hostName}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-muted-foreground">
                                    {t("room.status")}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span
                                        aria-hidden="true"
                                        className={`h-2 w-2 rounded-full ${
                                            isLive
                                                ? "bg-emerald-500"
                                                : "bg-muted-foreground/40"
                                        }`}
                                    />
                                    {statusText}
                                    {isLive && (
                                        <span className="text-muted-foreground">
                                            {"· "}
                                            {t("room.onlineCount", { count: onlineUserIds.length })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                    {t("room.members")}
                                </CardTitle>
                                {membersQuery.isSuccess && (
                                    <Badge variant="outline">
                                        {t("room.memberCount", { count: members.length })}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>{t("room.membersDescription")}</CardDescription>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4">
                            {membersQuery.isPending ? (
                                <p className="text-sm text-muted-foreground">
                                    {t("room.loadingMembers")}
                                </p>
                            ) : membersQuery.isError ? (
                                <p className="text-sm text-destructive">
                                    {errorText(t, membersQuery.error)}
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {members.map((member) => {
                                        const name =
                                            member.profiles?.display_name ?? t("common.unknown");
                                        const isMemberHost = member.user_id === room.host_id;
                                        const isYou = member.user_id === user?.id;
                                        const isOnline = onlineSet.has(member.user_id);
                                        const progress = progressOf(
                                            tasksOf(tasksQuery.data ?? [], member.user_id),
                                        );

                                        return (
                                            <li
                                                key={member.user_id}
                                                className="flex items-center justify-between gap-3 rounded-lg border bg-card/50 p-3 transition-colors hover:bg-accent/50"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="relative">
                                                        <Avatar className="h-9 w-9 border">
                                                            <AvatarFallback className="text-xs font-semibold">
                                                                {name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span
                                                            className={`absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                                                                isOnline
                                                                    ? "bg-emerald-500"
                                                                    : "bg-muted-foreground/40"
                                                            }`}
                                                        >
                                                            <span className="sr-only">
                                                                {isOnline
                                                                    ? t("room.online")
                                                                    : t("room.offline")}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium leading-none">
                                                            {name.charAt(0).toUpperCase() + name.slice(1)}
                                                            {isYou && (
                                                                <span className="text-xs font-normal text-muted-foreground">
                                                                    {" "}
                                                                    {t("common.you")}
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="pt-1 text-xs text-muted-foreground">
                                                            {t("room.joined", {
                                                                date: format(
                                                                    new Date(member.joined_at),
                                                                    "MMM d, HH:mm",
                                                                    { locale },
                                                                ),
                                                            })}
                                                            {progress.total > 0 && (
                                                                <>
                                                                    {" · "}
                                                                    {t("tasks.progressShort", progress)}
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isMemberHost ? (
                                                    <Badge className="gap-1 border-primary/20 bg-primary/10 text-primary hover:bg-primary/20">
                                                        <Shield className="h-3 w-3" aria-hidden="true" />
                                                        {t("common.host")}
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs font-normal text-muted-foreground"
                                                    >
                                                        {t("common.member")}
                                                    </Badge>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tasks */}
                {user && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <MyTasks roomId={room.id} userId={user.id} />
                        <TeamTasks
                            roomId={room.id}
                            currentUserId={user.id}
                            hostId={room.host_id}
                            members={membersQuery.data ?? []}
                        />
                    </div>
                )}
            </main>
        </>
    );
};

export default Room;
