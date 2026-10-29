import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type Announcements,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import TFieldError from "@/components/TFieldError";
import TaskProgress from "@/components/TaskProgress";
import { useRoomTasks } from "@/hooks/useRoomTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { errorText } from "@/lib/errorText";
import {
    needsRebalance,
    positionAtEnd,
    positionBetween,
    rebalancedPositions,
} from "@/lib/position";
import { progressOf, tasksOf } from "@/lib/taskCache";
import { taskSchema, type TaskSchema } from "@/lib/taskSchemas";
import type { RoomTask } from "@/lib/types";

type ItemProps = {
    task: RoomTask;
    onToggle: (task: RoomTask) => void;
    onDelete: (task: RoomTask) => void;
};

const SortableTask = ({ task, onToggle, onDelete }: ItemProps) => {
    const { t } = useTranslation();
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`flex items-center gap-2 rounded-lg border bg-card/50 p-2 ${
                isDragging ? "relative z-10 opacity-70 shadow-md" : ""
            }`}
        >
            <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label={t("tasks.dragHandle", { title: task.title })}
                className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            >
                <GripVertical className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
                type="checkbox"
                checked={task.done}
                onChange={() => onToggle(task)}
                aria-label={t("tasks.markDone", { title: task.title })}
                className="h-4 w-4 shrink-0 accent-primary"
            />
            <span
                className={`min-w-0 flex-1 break-words text-sm ${
                    task.done ? "text-muted-foreground line-through" : ""
                }`}
            >
                {task.title}
            </span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete(task)}
                aria-label={t("tasks.delete", { title: task.title })}
            >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
        </li>
    );
};

const MyTasks = ({ roomId, userId }: { roomId: string; userId: string }) => {
    const { t } = useTranslation();
    const tasksQuery = useRoomTasks(roomId);
    const { add, toggle, remove, reorder } = useTaskMutations(roomId, userId);

    const mine = useMemo(
        () => tasksOf(tasksQuery.data ?? [], userId),
        [tasksQuery.data, userId],
    );
    const { done, total } = progressOf(mine);

    const form = useForm<TaskSchema>({
        resolver: zodResolver(taskSchema),
        defaultValues: { title: "" },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const onSubmit = ({ title }: TaskSchema) => {
        add.mutate({
            id: crypto.randomUUID(),
            room_id: roomId,
            title,
            position: positionAtEnd(mine.map((task) => task.position)),
        });
        form.reset(); // optimistic: the row is already in the list
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = mine.findIndex((task) => task.id === active.id);
        const to = mine.findIndex((task) => task.id === over.id);
        if (from < 0 || to < 0) return;

        const reordered = arrayMove(mine, from, to);
        const before = reordered[to - 1]?.position;
        const after = reordered[to + 1]?.position;

        if (needsRebalance(before, after)) {
            reorder.mutate({
                updates: rebalancedPositions(reordered.map((task) => task.id)),
            });
        } else {
            reorder.mutate({
                updates: [
                    {
                        id: reordered[to].id,
                        position: positionBetween(before, after),
                    },
                ],
            });
        }
    };

    // Default announcements read raw ids (uuids). Say the task title instead.
    const titleOf = (id: string | number) =>
        mine.find((task) => task.id === id)?.title ?? "";
    const indexOf = (id: string | number) =>
        mine.findIndex((task) => task.id === id) + 1;

    const announcements: Announcements = {
        onDragStart: ({ active }) =>
            t("tasks.a11y.pickedUp", { title: titleOf(active.id) }),
        onDragOver: ({ active, over }) =>
            over
                ? t("tasks.a11y.movedOver", {
                      title: titleOf(active.id),
                      position: indexOf(over.id),
                      total,
                  })
                : undefined,
        onDragEnd: ({ active, over }) =>
            over
                ? t("tasks.a11y.dropped", {
                      title: titleOf(active.id),
                      position: indexOf(over.id),
                      total,
                  })
                : t("tasks.a11y.cancelled", { title: titleOf(active.id) }),
        onDragCancel: ({ active }) =>
            t("tasks.a11y.cancelled", { title: titleOf(active.id) }),
    };

    const mutationError =
        add.error ?? toggle.error ?? remove.error ?? reorder.error;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{t("tasks.myTitle")}</CardTitle>
                    {tasksQuery.isSuccess && (
                        <Badge variant="outline">
                            {t("tasks.progress", { done, total })}
                        </Badge>
                    )}
                </div>
                <CardDescription>{t("tasks.myDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex items-start gap-2"
                    noValidate
                >
                    <Controller
                        name="title"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field
                                className="flex-1"
                                data-invalid={fieldState.invalid}
                            >
                                <FieldLabel htmlFor="new-task-title" className="sr-only">
                                    {t("tasks.addLabel")}
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id="new-task-title"
                                    aria-invalid={fieldState.invalid}
                                    placeholder={t("tasks.addPlaceholder")}
                                    autoComplete="off"
                                />
                                <TFieldError error={fieldState.error} />
                            </Field>
                        )}
                    />
                    <Button type="submit">{t("tasks.add")}</Button>
                </form>

                {mutationError && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                        {errorText(t, mutationError)}
                    </p>
                )}

                {tasksQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">
                        {t("common.loading")}
                    </p>
                ) : tasksQuery.isError ? (
                    <p className="text-sm text-destructive">
                        {errorText(t, tasksQuery.error)}
                    </p>
                ) : mine.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t("tasks.empty")}
                    </p>
                ) : (
                    <>
                        <TaskProgress done={done} total={total} />
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            accessibility={{
                                announcements,
                                screenReaderInstructions: {
                                    draggable: t("tasks.a11y.instructions"),
                                },
                            }}
                        >
                            <SortableContext
                                items={mine.map((task) => task.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <ul className="space-y-2">
                                    {mine.map((task) => (
                                        <SortableTask
                                            key={task.id}
                                            task={task}
                                            onToggle={(row) =>
                                                toggle.mutate({
                                                    id: row.id,
                                                    done: !row.done,
                                                })
                                            }
                                            onDelete={(row) => remove.mutate(row.id)}
                                        />
                                    ))}
                                </ul>
                            </SortableContext>
                        </DndContext>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default MyTasks;
