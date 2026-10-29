-- =====================================================================
-- 002: Realtime authorization for the private room channel (presence)
-- Phase 2a. Topic format is "room:<room uuid>" and must match the client.
-- Only members of a room can join its channel and track presence.
-- =====================================================================

create policy "room members can receive presence"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'presence'
  and exists (
    select 1
    from public.room_members rm
    where rm.user_id = (select auth.uid())
      and ('room:' || rm.room_id::text) = (select realtime.topic())
  )
);

create policy "room members can send presence"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'presence'
  and exists (
    select 1
    from public.room_members rm
    where rm.user_id = (select auth.uid())
      and ('room:' || rm.room_id::text) = (select realtime.topic())
  )
);
