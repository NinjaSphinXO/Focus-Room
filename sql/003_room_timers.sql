-- =====================================================================
-- 003: shared timer (server-owned timestamps) + host-only control functions
-- Phase 2b. Needs 001. Realtime events come from the supabase_realtime publication.
-- =====================================================================

-- ============ TABLE ============
create table public.room_timers (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  phase text not null default 'focus' check (phase in ('focus', 'break')),
  status text not null default 'idle' check (status in ('idle', 'running', 'paused')),
  duration_seconds integer not null default 1500 check (duration_seconds between 60 and 7200),
  remaining_seconds integer not null default 1500 check (remaining_seconds >= 0),
  ends_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint running_has_end check ((status = 'running') = (ends_at is not null))
);

-- ============ RLS: members read. NO write policies (writes only via functions) ============
alter table public.room_timers enable row level security;

create policy "timers read" on public.room_timers
  for select to authenticated
  using (public.is_room_member(room_id));

-- ============ TRIGGER: every new room gets a timer ============
create function public.create_room_timer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.room_timers (room_id) values (new.id);
  return new;
end;
$$;

create trigger on_room_created_timer
  after insert on public.rooms
  for each row execute function public.create_room_timer();

-- existing rooms
insert into public.room_timers (room_id)
select id from public.rooms
on conflict do nothing;

-- ============ REALTIME ============
alter publication supabase_realtime add table public.room_timers;

-- ============ FUNCTIONS (host only) ============
create function public.timer_start(p_room_id uuid)
returns public.room_timers
language plpgsql
security definer
set search_path = ''
as $$
declare t public.room_timers;
begin
  if not exists (
    select 1 from public.rooms where id = p_room_id and host_id = auth.uid()
  ) then
    raise exception 'NOT_HOST' using errcode = '42501';
  end if;

  update public.room_timers
     set status = 'running',
         ends_at = now() + make_interval(secs => remaining_seconds),
         updated_at = now()
   where room_id = p_room_id and status <> 'running'
   returning * into t;

  if not found then
    select * into t from public.room_timers where room_id = p_room_id;
  end if;
  return t;
end;
$$;

create function public.timer_pause(p_room_id uuid)
returns public.room_timers
language plpgsql
security definer
set search_path = ''
as $$
declare t public.room_timers;
begin
  if not exists (
    select 1 from public.rooms where id = p_room_id and host_id = auth.uid()
  ) then
    raise exception 'NOT_HOST' using errcode = '42501';
  end if;

  update public.room_timers
     set status = 'paused',
         remaining_seconds = greatest(0, ceil(extract(epoch from (ends_at - now())))::int),
         ends_at = null,
         updated_at = now()
   where room_id = p_room_id and status = 'running'
   returning * into t;

  if not found then
    select * into t from public.room_timers where room_id = p_room_id;
  end if;
  return t;
end;
$$;

-- set phase + length, back to idle (used for Reset and Focus/Break presets)
create function public.timer_set(p_room_id uuid, p_phase text, p_duration_seconds integer)
returns public.room_timers
language plpgsql
security definer
set search_path = ''
as $$
declare t public.room_timers;
begin
  if not exists (
    select 1 from public.rooms where id = p_room_id and host_id = auth.uid()
  ) then
    raise exception 'NOT_HOST' using errcode = '42501';
  end if;

  update public.room_timers
     set phase = p_phase,
         duration_seconds = p_duration_seconds,
         remaining_seconds = p_duration_seconds,
         status = 'idle',
         ends_at = null,
         updated_at = now()
   where room_id = p_room_id
   returning * into t;
  return t;
end;
$$;

create function public.get_server_time()
returns timestamptz
language sql
as $$ select clock_timestamp(); $$;

-- ============ GRANTS ============
revoke execute on function public.timer_start(uuid) from public, anon;
revoke execute on function public.timer_pause(uuid) from public, anon;
revoke execute on function public.timer_set(uuid, text, integer) from public, anon;
revoke execute on function public.get_server_time() from public, anon;
grant execute on function public.timer_start(uuid) to authenticated;
grant execute on function public.timer_pause(uuid) to authenticated;
grant execute on function public.timer_set(uuid, text, integer) to authenticated;
grant execute on function public.get_server_time() to authenticated;
