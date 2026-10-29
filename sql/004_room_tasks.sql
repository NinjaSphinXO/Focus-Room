-- =====================================================================
-- 004: per-member task queue inside a room
-- Phase 3. Needs 001. Run once, then regenerate types.
-- =====================================================================

create table public.room_tasks (
  id uuid primary key default gen_random_uuid(),            -- client may send its own id (optimistic UI)
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  done boolean not null default false,
  position double precision not null,                       -- fractional ordering: one row changes per drag
  created_at timestamptz not null default now()
);

create index room_tasks_room_idx on public.room_tasks (room_id, user_id, position);

-- ============ RLS ============
alter table public.room_tasks enable row level security;

-- everyone in the room can SEE all tasks in the room
create policy "tasks read" on public.room_tasks
  for select to authenticated
  using (public.is_room_member(room_id));

-- you can only create / change / delete YOUR OWN tasks, in rooms you belong to
create policy "tasks insert own" on public.room_tasks
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_room_member(room_id));

create policy "tasks update own" on public.room_tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_room_member(room_id));

create policy "tasks delete own" on public.room_tasks
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============ room_id / user_id can never change after insert ============
create function public.room_tasks_lock_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.room_id <> old.room_id or new.user_id <> old.user_id then
    raise exception 'IMMUTABLE_COLUMNS' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger room_tasks_lock
  before update on public.room_tasks
  for each row execute function public.room_tasks_lock_columns();

-- ============ leaving a room removes your tasks from it ============
create function public.cleanup_member_tasks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.room_tasks
   where room_id = old.room_id and user_id = old.user_id;
  return old;
end;
$$;

create trigger on_member_left
  after delete on public.room_members
  for each row execute function public.cleanup_member_tasks();

-- ============ REALTIME ============
alter publication supabase_realtime add table public.room_tasks;
