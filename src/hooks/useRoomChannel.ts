import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAppDispatch } from "@/store/hooks";
import { resetRoom, setChannelStatus, setOnline } from "@/store/roomSlice";
import {
    roomTasksKey,
    roomTimerKey,
    taskMutationKey,
} from "@/lib/queryKeys";
import { removeTask, upsertTask } from "@/lib/taskCache";
import type { RoomTask, RoomTimer } from "@/lib/types";

// ONE channel per room. Presence, timer and task updates all travel on it.
export function useRoomChannel(
    roomId: string | undefined,
    userId: string | undefined,
) {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!roomId || !userId) return;

        const channel = supabase.channel(`room:${roomId}`, {
            config: { private: true, presence: { key: userId } },
        });

        // While one of OUR mutations is in flight, ignore echoes: the optimistic cache is
        // already right, and the last mutation's onSettled refetch resyncs everything.
        const applyTaskChange = (
            apply: (old: RoomTask[] | undefined) => RoomTask[] | undefined,
        ) => {
            if (queryClient.isMutating({ mutationKey: taskMutationKey(roomId) }) > 0) {
                return;
            }
            queryClient.setQueryData<RoomTask[]>(roomTasksKey(roomId), apply);
        };

        const roomFilter = `room_id=eq.${roomId}`;

        channel
            .on("presence", { event: "sync" }, () => {
                dispatch(setOnline(Object.keys(channel.presenceState())));
            })
            // ---- timer ----
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "room_timers", filter: roomFilter },
                (payload) => {
                    const next = payload.new as RoomTimer;
                    // Ignore events older than what we already have
                    queryClient.setQueryData<RoomTimer>(roomTimerKey(roomId), (old) =>
                        !old || Date.parse(next.updated_at) >= Date.parse(old.updated_at)
                            ? next
                            : old,
                    );
                },
            )
            // ---- tasks ----
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "room_tasks", filter: roomFilter },
                (payload) => applyTaskChange((old) => upsertTask(old, payload.new as RoomTask)),
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "room_tasks", filter: roomFilter },
                (payload) => applyTaskChange((old) => upsertTask(old, payload.new as RoomTask)),
            )
            // DELETE events cannot be filtered by column. removeTask ignores ids we do not have.
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "room_tasks" },
                (payload) => {
                    const id = (payload.old as { id?: string }).id;
                    if (id) applyTaskChange((old) => removeTask(old, id));
                },
            )
            .subscribe(async (status, err) => {
                dispatch(setChannelStatus(status));
                if (err) console.error("Realtime channel error:", err);
                if (status === "SUBSCRIBED") {
                    // Catch anything missed before subscribing or while offline
                    queryClient.invalidateQueries({ queryKey: roomTimerKey(roomId) });
                    queryClient.invalidateQueries({ queryKey: roomTasksKey(roomId) });
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            dispatch(resetRoom());
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, dispatch, queryClient]);
}
