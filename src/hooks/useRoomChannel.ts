import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAppDispatch } from "@/store/hooks";
import { resetRoom, setChannelStatus, setOnline } from "@/store/roomSlice";
import { roomTimerKey } from "@/hooks/useRoomTimer";
import type { RoomTimer } from "@/lib/types";

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

        channel
            .on("presence", { event: "sync" }, () => {
                dispatch(setOnline(Object.keys(channel.presenceState())));
            })
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "room_timers",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const next = payload.new as RoomTimer;
                    // Ignore events older than what we already have
                    queryClient.setQueryData<RoomTimer>(
                        roomTimerKey(roomId),
                        (old) =>
                            !old ||
                            Date.parse(next.updated_at) >=
                                Date.parse(old.updated_at)
                                ? next
                                : old,
                    );
                },
            )
            .subscribe(async (status, err) => {
                dispatch(setChannelStatus(status));
                if (err) console.error("Realtime channel error:", err);
                if (status === "SUBSCRIBED") {
                    // Catch anything missed before subscribing or while offline
                    queryClient.invalidateQueries({
                        queryKey: roomTimerKey(roomId),
                    });
                    await channel.track({
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            dispatch(resetRoom());
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, dispatch, queryClient]);
}