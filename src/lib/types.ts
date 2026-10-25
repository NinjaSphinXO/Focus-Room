import type { Tables } from "./database.types";

export type Profile = Tables<"profiles">;
export type Room = Tables<"rooms">;
export type RoomMember = Tables<"room_members">;