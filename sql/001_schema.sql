-- =====================================================================
-- 001: core schema (profiles, rooms, room_members), triggers, join function, RLS
-- Phase 1. Run ONCE, first. Needs a fresh Supabase project (or drop the objects first).
-- =====================================================================

-- ============ TABLES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  name text not null check (char_length(name) between 3 and 50),
  host_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ============ HELPER (bypasses RLS, avoids policy recursion) ============
create function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- ============ TRIGGER: profile on signup ============
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ TRIGGER: host auto-joins own room ============
create function public.add_host_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.room_members (room_id, user_id) values (new.id, new.host_id);
  return new;
end;
$$;

create trigger on_room_created
  after insert on public.rooms
  for each row execute function public.add_host_as_member();

-- ============ RPC: join by code ============
create function public.join_room_by_code(p_code text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare r public.rooms;
begin
  select * into r from public.rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0002';
  end if;
  insert into public.room_members (room_id, user_id)
  values (r.id, auth.uid())
  on conflict do nothing;
  return r;
end;
$$;

revoke execute on function public.join_room_by_code(text) from public, anon;
grant execute on function public.join_room_by_code(text) to authenticated;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

-- profiles: logged-in read all, edit own
create policy "profiles read" on public.profiles
  for select to authenticated using (true);
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- rooms: see only own/joined rooms. host manages.
create policy "rooms read" on public.rooms
  for select to authenticated
  using (host_id = auth.uid() or public.is_room_member(id));
create policy "rooms insert" on public.rooms
  for insert to authenticated with check (host_id = auth.uid());
create policy "rooms update host" on public.rooms
  for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "rooms delete host" on public.rooms
  for delete to authenticated using (host_id = auth.uid());

-- room_members: see members of rooms you are in. leave = delete self.
-- No insert policy on purpose: joining only via join_room_by_code / host trigger.
create policy "members read" on public.room_members
  for select to authenticated using (public.is_room_member(room_id));
create policy "members leave" on public.room_members
  for delete to authenticated using (user_id = auth.uid());
