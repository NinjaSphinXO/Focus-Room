import type { Tables } from "./database.types";

export type Profile = Tables<"profiles">;
export type Room = Tables<"rooms">;
export type RoomMember = Tables<"room_members">;
export type RoomTimer = Tables<"room_timers">;
export type RoomTask = Tables<"room_tasks">;
export type FocusSession = Tables<"focus_sessions">;
