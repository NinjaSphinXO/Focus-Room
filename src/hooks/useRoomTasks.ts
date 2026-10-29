import { useQuery } from "@tanstack/react-query";
import { getRoomTasks } from "@/api/tasks";
import { roomTasksKey } from "@/lib/queryKeys";

// ONE cache entry holds every member's tasks in the room.
// "My tasks" / "team tasks" are derived views (see lib/taskCache.ts).
export function useRoomTasks(roomId: string | undefined) {
    return useQuery({
        queryKey: roomTasksKey(roomId),
        queryFn: () => getRoomTasks(roomId!),
        enabled: !!roomId,
    });
}
