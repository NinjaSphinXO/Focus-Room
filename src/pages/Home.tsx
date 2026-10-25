import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { createRoom, getMyRooms, joinRoom } from "@/api/rooms";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    createRoomSchema,
    joinRoomSchema,
    type CreateRoomSchema,
    type JoinRoomSchema,
} from "@/lib/roomSchemas";
import { useAppSelector } from "@/store/hooks";

const Home = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const user = useAppSelector((s) => s.auth.user);

    const createForm = useForm<CreateRoomSchema>({
        resolver: zodResolver(createRoomSchema),
        defaultValues: { name: "" },
    });

    const joinForm = useForm<JoinRoomSchema>({
        resolver: zodResolver(joinRoomSchema),
        defaultValues: { code: "" },
    });

    const roomsQuery = useQuery({
        queryKey: ["rooms"],
        queryFn: getMyRooms,
    });

    // Not optimistic: room code is made by the server, so wait for it.
    const createRoomMutation = useMutation({
        mutationFn: createRoom,
        onSuccess: (room) => {
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            createForm.reset();
            navigate(`/room/${room.code}`);
        },
    });

    const joinRoomMutation = useMutation({
        mutationFn: joinRoom,
        onSuccess: (room) => {
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
            joinForm.reset();
            navigate(`/room/${room.code}`);
        },
    });

    const onCreate = (values: CreateRoomSchema) => {
        createRoomMutation.mutate(values.name);
    };

    const onJoin = (values: JoinRoomSchema) => {
        joinRoomMutation.mutate(values.code.toUpperCase());
    };

    return (
        <div className="mx-auto min-h-screen max-w-5xl space-y-6 bg-background p-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Focus Rooms
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Signed in as{" "}
                        {user?.user_metadata?.display_name ?? user?.email}
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => supabase.auth.signOut()}
                >
                    Logout
                </Button>
            </div>

            {/* Create & Join */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Create */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Create a Room</CardTitle>
                        <CardDescription>
                            Start a new focus room and share the code.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {createRoomMutation.isError && (
                            <p
                                role="alert"
                                className="mb-4 text-sm font-medium text-destructive"
                            >
                                {createRoomMutation.error.message}
                            </p>
                        )}
                        <form
                            id="create-room-form"
                            onSubmit={createForm.handleSubmit(onCreate)}
                        >
                            <FieldGroup>
                                <Controller
                                    name="name"
                                    control={createForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldLabel htmlFor="create-room-name">
                                                Room name
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="create-room-name"
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                placeholder="e.g. Exam week grind"
                                                autoComplete="off"
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            form="create-room-form"
                            className="w-full"
                            disabled={createRoomMutation.isPending}
                        >
                            {createRoomMutation.isPending
                                ? "Creating..."
                                : "Create Room"}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Join */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Join a Room</CardTitle>
                        <CardDescription>
                            Enter a 6-character room code.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {joinRoomMutation.isError && (
                            <p
                                role="alert"
                                className="mb-4 text-sm font-medium text-destructive"
                            >
                                {joinRoomMutation.error.message}
                            </p>
                        )}
                        <form
                            id="join-room-form"
                            onSubmit={joinForm.handleSubmit(onJoin)}
                        >
                            <FieldGroup>
                                <Controller
                                    name="code"
                                    control={joinForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldLabel htmlFor="join-room-code">
                                                Room code
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="join-room-code"
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                                placeholder="A3F9C2"
                                                autoComplete="off"
                                                className="uppercase"
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            form="join-room-form"
                            className="w-full"
                            disabled={joinRoomMutation.isPending}
                        >
                            {joinRoomMutation.isPending
                                ? "Joining..."
                                : "Join Room"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* My rooms */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">
                    My Rooms
                </h2>

                {roomsQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">
                        Loading rooms...
                    </p>
                ) : roomsQuery.isError ? (
                    <p className="text-sm text-destructive">
                        Error: {roomsQuery.error.message}
                    </p>
                ) : roomsQuery.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No rooms yet. Create one or join with a code.
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {roomsQuery.data.map((room) => (
                            <Card
                                key={room.id}
                                className="flex flex-col justify-between"
                            >
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">
                                        {room.name}
                                    </CardTitle>
                                    <CardDescription className="font-mono">
                                        {room.code}
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="pt-0">
                                    <Button
                                        variant="outline"
                                        className="h-8 w-full text-xs"
                                        onClick={() =>
                                            navigate(`/room/${room.code}`)
                                        }
                                    >
                                        Enter Room
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;