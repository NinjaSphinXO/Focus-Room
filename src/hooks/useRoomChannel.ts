import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppDispatch } from "@/store/hooks";
import { resetRoom, setChannelStatus, setOnline } from "@/store/roomSlice";

export function useRoomChannel(
    roomId: string | undefined,
    userId: string | undefined,
) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (!roomId || !userId) return;

        const channel = supabase.channel(`room:${roomId}`, {
            config: { private: true, presence: { key: userId } },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                dispatch(setOnline(Object.keys(channel.presenceState())));
            })
            .subscribe(async (status, err) => {
                dispatch(setChannelStatus(status));
                if (err) console.error("Realtime channel error:", err);
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            dispatch(resetRoom());
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, dispatch]);
}