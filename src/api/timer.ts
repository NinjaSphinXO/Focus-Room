import { supabase } from "@/lib/supabaseClient";

export type TimerPhase = "focus" | "break";

export const getTimer = async (roomId: string) => {
    const { data, error } = await supabase
        .from("room_timers")
        .select("*")
        .eq("room_id", roomId)
        .single();
    if (error) throw error;
    return data;
};

export const startTimer = async (roomId: string) => {
    const { data, error } = await supabase.rpc("timer_start", {
        p_room_id: roomId,
    });
    if (error) throw error;
    return data;
};

export const pauseTimer = async (roomId: string) => {
    const { data, error } = await supabase.rpc("timer_pause", {
        p_room_id: roomId,
    });
    if (error) throw error;
    return data;
};

export const setTimer = async (
    roomId: string,
    phase: TimerPhase,
    durationSeconds: number,
) => {
    const { data, error } = await supabase.rpc("timer_set", {
        p_room_id: roomId,
        p_phase: phase,
        p_duration_seconds: durationSeconds,
    });
    if (error) throw error;
    return data;
};

// Returns: serverTime - clientTime in ms. Positive = your clock is behind.
export const getServerOffset = async () => {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc("get_server_time");
    const t1 = Date.now();
    if (error) throw error;

    const serverMs = Date.parse(data);
    if (Number.isNaN(serverMs)) throw new Error("Invalid server time");

    // Server answered roughly halfway through the round trip
    return serverMs - (t0 + t1) / 2;
};