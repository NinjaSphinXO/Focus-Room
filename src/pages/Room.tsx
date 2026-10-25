import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { deleteRoom, getMembers, leaveRoom, roomByCode } from "@/api/rooms";
import { useAppSelector } from "@/store/hooks";

const Room = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { code } = useParams<{ code: string }>();
    const user = useAppSelector((s) => s.auth.user);

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
        queryKey: ["room-members", roomId],
        queryFn: () => getMembers(roomId!),
        enabled: !!roomId,
    });

    // ── Mutations (plain, not optimistic: user leaves this page anyway) ──
    const afterRoomGone = () => {
        navigate("/");
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        queryClient.removeQueries({ queryKey: ["room", code] });
        queryClient.removeQueries({ queryKey: ["room-members"] });
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
        await navigator.clipboard.writeText(text);
        setCopied(true);
    };

    // ── Page states ──
    if (roomQuery.isPending) {
        return (
            <p className="p-6 text-sm text-muted-foreground">Loading room...</p>
        );
    }

    if (roomQuery.isError) {
        return (
            <p className="p-6 text-sm text-destructive">
                Error: {roomQuery.error.message}
            </p>
        );
    }

    if (!roomQuery.data) {
        return (
            <div className="mx-auto max-w-md space-y-4 p-6 text-center">
                <h1 className="text-xl font-semibold">Room not found</h1>
                <p className="text-sm text-muted-foreground">
                    This room does not exist, or you are not a member.
                </p>
                <Button render={<Link to="/" />}>Back to rooms</Button>
            </div>
        );
    }

    const room = roomQuery.data;
    const isHost = room.host_id === user?.id;

    const members = [...(membersQuery.data ?? [])].sort((a, b) => {
        if (a.user_id === room.host_id) return -1;
        if (b.user_id === room.host_id) return 1;
        return (
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
    });

    const hostName =
        members.find((m) => m.user_id === room.host_id)?.profiles
            ?.display_name ?? "Unknown";

    const handleLeave = () => {
        if (user) leaveMutation.mutate({ roomId: room.id, userId: user.id });
    };

    const actionError = leaveMutation.error ?? deleteMutation.error;

    return (
        <div className="mx-auto min-h-screen max-w-5xl space-y-6 bg-background p-6">
            {/* Top bar */}
            <div className="flex items-center justify-between">
                <Button
                    className="gap-2 pl-0 hover:bg-transparent"
                    variant="ghost"
                    onClick={() => navigate("/")}
                >
                    <ArrowLeft className="h-4 w-4" /> Back to rooms
                </Button>

                <div className="flex items-center gap-2">
                    {!isHost && (
                        <Button
                            variant="outline"
                            className="gap-2 text-muted-foreground hover:text-foreground"
                            onClick={handleLeave}
                            disabled={leaveMutation.isPending}
                        >
                            <LogOut className="h-4 w-4" />
                            {leaveMutation.isPending
                                ? "Leaving..."
                                : "Leave Room"}
                        </Button>
                    )}

                    {isHost && (
                        <Button
                            variant="destructive"
                            className="gap-2"
                            onClick={() => setDeleteOpen(true)}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="h-4 w-4" /> Delete Room
                        </Button>
                    )}
                </div>
            </div>

            {actionError && (
                <p
                    role="alert"
                    className="text-sm font-medium text-destructive"
                >
                    {actionError.message}
                </p>
            )}

            {/* Delete confirm */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this room?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{room.name}" will be permanently deleted for all
                            members. This can't be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(room.id)}
                        >
                            {deleteMutation.isPending
                                ? "Deleting..."
                                : "Delete Room"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Main grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Room info */}
                <Card className="h-fit md:col-span-1">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                            <Badge
                                variant="secondary"
                                className="font-mono text-xs"
                            >
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
                                        <Check className="h-3.5 w-3.5" /> Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3.5 w-3.5" /> Copy
                                    </>
                                )}
                            </Button>
                        </div>
                        <CardTitle className="pt-2 text-xl">
                            {room.name}
                        </CardTitle>
                        <CardDescription>
                            Created{" "}
                            {format(new Date(room.created_at), "MMM d, yyyy")}
                        </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-1 pt-4">
                        <div className="text-sm font-medium text-muted-foreground">
                            Hosted by
                        </div>
                        <div className="text-sm">{hostName}</div>
                    </CardContent>
                </Card>

                {/* Members */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                Members
                            </CardTitle>
                            {membersQuery.isSuccess && (
                                <Badge variant="outline">
                                    {members.length}{" "}
                                    {members.length === 1
                                        ? "member"
                                        : "members"}
                                </Badge>
                            )}
                        </div>
                        <CardDescription>
                            People who joined this room.
                        </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-4">
                        {membersQuery.isPending ? (
                            <p className="text-sm text-muted-foreground">
                                Loading members...
                            </p>
                        ) : membersQuery.isError ? (
                            <p className="text-sm text-destructive">
                                Error: {membersQuery.error.message}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {members.map((member) => {
                                    const name =
                                        member.profiles?.display_name ??
                                        "Unknown";
                                    const isMemberHost =
                                        member.user_id === room.host_id;
                                    const isYou = member.user_id === user?.id;

                                    return (
                                        <div
                                            key={member.user_id}
                                            className="flex items-center justify-between rounded-lg border bg-card/50 p-3 transition-colors hover:bg-accent/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border">
                                                    <AvatarFallback className="text-xs font-semibold">
                                                        {name
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium leading-none">
                                                        {name
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            name.slice(1)}
                                                        {isYou && (
                                                            <span className="text-xs font-normal text-muted-foreground">
                                                                {" "}
                                                                (you)
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="pt-1 text-xs text-muted-foreground">
                                                        Joined{" "}
                                                        {format(
                                                            new Date(
                                                                member.joined_at,
                                                            ),
                                                            "MMM d, HH:mm",
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            {isMemberHost ? (
                                                <Badge className="gap-1 border-primary/20 bg-primary/10 text-primary hover:bg-primary/20">
                                                    <Shield className="h-3 w-3" />
                                                    Host
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs font-normal text-muted-foreground"
                                                >
                                                    Member
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Room;
