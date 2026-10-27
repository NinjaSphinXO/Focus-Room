import { useQuery } from "@tanstack/react-query";
import { getServerOffset, getTimer } from "@/api/timer";

// One place for the key, so the realtime listener and the query never drift apart
export const roomTimerKey = (roomId: string | undefined) =>
    ["room-timer", roomId] as const;

export function useRoomTimer(roomId: string | undefined) {
    return useQuery({
        queryKey: roomTimerKey(roomId),
        queryFn: () => getTimer(roomId!),
        enabled: !!roomId,
    });
}

// serverTime - clientTime in ms. 0 until measured.
export function useServerOffset() {
    const { data } = useQuery({
        queryKey: ["server-offset"],
        queryFn: getServerOffset,
        staleTime: 5 * 60 * 1000,
    });
    return data ?? 0;
}