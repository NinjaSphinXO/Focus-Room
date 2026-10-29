import { useQuery } from "@tanstack/react-query";
import { getServerOffset, getTimer } from "@/api/timer";
import { roomTimerKey } from "@/lib/queryKeys";

export { roomTimerKey };

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
