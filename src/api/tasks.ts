import { supabase } from "@/lib/supabaseClient";

export type NewTaskInput = {
    id: string; // generated on the client so the optimistic row and the real row share one id
    room_id: string;
    title: string;
    position: number;
};

export type TaskPatch = { done?: boolean; position?: number; title?: string };

export const getRoomTasks = async (roomId: string) => {
    const { data, error } = await supabase
        .from("room_tasks")
        .select("*")
        .eq("room_id", roomId)
        .order("position", { ascending: true });
    if (error) throw error;
    return data;
};

export const addTask = async (task: NewTaskInput) => {
    const { data, error } = await supabase
        .from("room_tasks")
        .insert(task)
        .select()
        .single();
    if (error) throw error;
    return data;
};

// RLS hides other people's rows, so an update on them matches 0 rows and `.single()` throws.
export const updateTask = async (id: string, patch: TaskPatch) => {
    const { data, error } = await supabase
        .from("room_tasks")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteTask = async (id: string) => {
    const { error, count } = await supabase
        .from("room_tasks")
        .delete({ count: "exact" })
        .eq("id", id);
    if (error) throw error;
    if (count === 0) throw new Error("errors.taskDeleteFailed");
};
