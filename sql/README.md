# Supabase SQL

Run these in the **Supabase SQL Editor**, in this order, **once each**.
They use plain `create`, so running one twice fails with "already exists".

| File | What it sets up |
|---|---|
| `001_schema.sql` | profiles, rooms, room_members, signup/host triggers, `join_room_by_code`, RLS |
| `002_realtime_presence_policies.sql` | only room members can join the private `room:<id>` channel |
| `003_room_timers.sql` | shared timer table, host-only start/pause/set functions, server clock function, realtime |
| `004_room_tasks.sql` | per-member task lists, RLS (read all in room, write own), cleanup on leave, realtime |
| `005_focus_sessions.sql` | focus history + `record_focus_session` (server decides the length) |

After any change here, regenerate the TypeScript types:

```bash
npm run update-types
```

## Not SQL: dashboard settings the app depends on
- Authentication, Providers, Email: **Confirm email** is OFF for development.
- Authentication, URL Configuration: Site URL and Redirect URLs for localhost and your Vercel domain.
- Realtime settings: turn off public channel access if the option is there, so only private channels work.

## Quick audit
Every table must have RLS on:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```
