-- =====================================================================
-- PHASE 4: focus session history + server-validated recording
-- Run once in Supabase SQL Editor. Then regenerate types.
-- =====================================================================

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,   -- keep your stats if the room is deleted
  ended_at timestamptz not null,
  seconds integer not null check (seconds between 60 and 7200),
  created_at timestamptz not null default now(),
  unique (user_id, room_id, ended_at)                              -- same session can only count once
);

create index focus_sessions_user_idx on public.focus_sessions (user_id, ended_at desc);

alter table public.focus_sessions enable row level security;

-- you can read ONLY your own sessions. No write policies: rows come from the function below.
create policy "sessions read own" on public.focus_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Called by each member's client when a focus timer hits 0:00.
-- The SERVER decides the length (from the timer row), so a client cannot claim extra minutes.
create function public.record_focus_session(p_room_id uuid)
returns public.focus_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.room_timers;
  s public.focus_sessions;
begin
  if not public.is_room_member(p_room_id) then
    raise exception 'NOT_MEMBER' using errcode = '42501';
  end if;

  select * into t from public.room_timers where room_id = p_room_id;

  -- must be a focus timer that is running, already finished (3s tolerance for clock error),
  -- and finished recently (so opening a stale room later does not credit you)
  if not found
     or t.phase <> 'focus'
     or t.status <> 'running'
     or t.ends_at is null
     or t.ends_at > now() + interval '3 seconds'
     or t.ends_at < now() - interval '2 minutes' then
    raise exception 'NO_FINISHED_SESSION' using errcode = 'P0002';
  end if;

  insert into public.focus_sessions (user_id, room_id, ended_at, seconds)
  values (auth.uid(), p_room_id, t.ends_at, t.duration_seconds)
  on conflict (user_id, room_id, ended_at) do nothing
  returning * into s;

  if s.id is null then   -- already recorded (second tab, retry): return the existing row
    select * into s from public.focus_sessions
     where user_id = auth.uid() and room_id = p_room_id and ended_at = t.ends_at;
  end if;

  return s;
end;
$$;

revoke execute on function public.record_focus_session(uuid) from public, anon;
grant execute on function public.record_focus_session(uuid) to authenticated;
