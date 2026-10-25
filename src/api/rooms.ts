import { supabase } from "@/lib/supabaseClient";

export const getMyRooms = async () => {
    const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
};

export const createRoom = async (name: string) => {
    const { data, error } = await supabase
        .from("rooms")
        .insert({ name })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const joinRoom = async (code: string) => {
    const { data, error } = await supabase.rpc("join_room_by_code", {
        p_code: code,
    });
    if (error) {
        if (error.code === "P0002") {
            throw new Error("Room not found. Check the code.");
        }
        throw error;
    }
    return data;
};

export const roomByCode = async (code: string) => {
    const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code.toUpperCase())
        .maybeSingle();
    if (error) throw error;
    return data;
};

export const getMembers = async (roomId: string) => {
    const { data, error } = await supabase
        .from("room_members")
        .select("user_id, joined_at, profiles(display_name)")
        .eq("room_id", roomId);
    if (error) throw error;
    return data;
};

export type RoomMember = Awaited<ReturnType<typeof getMembers>>[number];

export const leaveRoom = async (roomId: string, userId: string) => {
    const { error, count } = await supabase
        .from("room_members")
        .delete({ count: "exact" })
        .eq("room_id", roomId)
        .eq("user_id", userId);
    if (error) throw error;
    if (count === 0) throw new Error("Could not leave the room.");
};

export const deleteRoom = async (roomId: string) => {
    const { error, count } = await supabase
        .from("rooms")
        .delete({ count: "exact" })
        .eq("id", roomId);
    if (error) throw error;
    if (count === 0) throw new Error("Only the host can delete this room.");
};