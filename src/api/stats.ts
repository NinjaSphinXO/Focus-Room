import { supabase } from "@/lib/supabaseClient";

// RLS returns only YOUR sessions, so no user filter is needed.
export const getMySessions = async (sinceIso: string) => {
    const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .gte("ended_at", sinceIso)
        .order("ended_at", { ascending: false });
    if (error) throw error;
    return data;
};

// Tasks you finished, across all your rooms. (Rooms you left delete your tasks, see SQL.)
export const getMyDoneTaskCount = async (userId: string) => {
    const { count, error } = await supabase
        .from("room_tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("done", true);
    if (error) throw error;
    return count ?? 0;
};

export const recordFocusSession = async (roomId: string) => {
    const { data, error } = await supabase.rpc("record_focus_session", {
        p_room_id: roomId,
    });
    if (error) {
        if (error.code === "P0002") throw new Error("errors.sessionNotReady");
        throw error;
    }
    return data;
};
