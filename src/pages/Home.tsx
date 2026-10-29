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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import AppHeader from "@/components/AppHeader";
import TFieldError from "@/components/TFieldError";
import { createRoom, getMyRooms, joinRoom } from "@/api/rooms";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
    createRoomSchema,
    joinRoomSchema,
    type CreateRoomSchema,
    type JoinRoomSchema,
} from "@/lib/roomSchemas";
import { errorText } from "@/lib/errorText";

const Home = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

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
        <>
            <AppHeader />
            <main
                id="main-content"
                tabIndex={-1}
                className="mx-auto max-w-5xl space-y-6 p-6"
            >
                <h1 className="text-2xl font-bold tracking-tight">
                    {t("home.title")}
                </h1>

                {/* Create & Join */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t("home.createTitle")}</CardTitle>
                            <CardDescription>{t("home.createDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {createRoomMutation.isError && (
                                <p role="alert" className="mb-4 text-sm font-medium text-destructive">
                                    {errorText(t, createRoomMutation.error)}
                                </p>
                            )}
                            <form
                                id="create-room-form"
                                onSubmit={createForm.handleSubmit(onCreate)}
                                noValidate
                            >
                                <FieldGroup>
                                    <Controller
                                        name="name"
                                        control={createForm.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="create-room-name">
                                                    {t("home.roomName")}
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="create-room-name"
                                                    aria-invalid={fieldState.invalid}
                                                    placeholder={t("home.roomNamePlaceholder")}
                                                    autoComplete="off"
                                                />
                                                <TFieldError error={fieldState.error} />
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
                                    ? t("home.creating")
                                    : t("home.create")}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{t("home.joinTitle")}</CardTitle>
                            <CardDescription>{t("home.joinDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {joinRoomMutation.isError && (
                                <p role="alert" className="mb-4 text-sm font-medium text-destructive">
                                    {errorText(t, joinRoomMutation.error)}
                                </p>
                            )}
                            <form
                                id="join-room-form"
                                onSubmit={joinForm.handleSubmit(onJoin)}
                                noValidate
                            >
                                <FieldGroup>
                                    <Controller
                                        name="code"
                                        control={joinForm.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="join-room-code">
                                                    {t("home.roomCode")}
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="join-room-code"
                                                    dir="ltr"
                                                    aria-invalid={fieldState.invalid}
                                                    placeholder="A3F9C2"
                                                    autoComplete="off"
                                                    className="uppercase"
                                                />
                                                <TFieldError error={fieldState.error} />
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
                                    ? t("home.joining")
                                    : t("home.join")}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* My rooms */}
                <section className="space-y-4" aria-labelledby="my-rooms-heading">
                    <h2 id="my-rooms-heading" className="text-xl font-semibold tracking-tight">
                        {t("home.myRooms")}
                    </h2>

                    {roomsQuery.isPending ? (
                        <p className="text-sm text-muted-foreground">{t("home.loadingRooms")}</p>
                    ) : roomsQuery.isError ? (
                        <p role="alert" className="text-sm text-destructive">
                            {errorText(t, roomsQuery.error)}
                        </p>
                    ) : roomsQuery.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("home.noRooms")}</p>
                    ) : (
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {roomsQuery.data.map((room) => (
                                <li key={room.id}>
                                    <Card className="flex h-full flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">{room.name}</CardTitle>
                                            <CardDescription className="font-mono" dir="ltr">
                                                {room.code}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardFooter className="pt-0">
                                            <Button
                                                variant="outline"
                                                className="h-8 w-full text-xs"
                                                onClick={() => navigate(`/room/${room.code}`)}
                                                aria-label={t("home.enterRoomLabel", { name: room.name })}
                                            >
                                                {t("home.enterRoom")}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </>
    );
};

export default Home;
