# FocusRoom: phases 3 to 6

Everything from the task queue to deploy. Read "WHAT TO DO" first, review later.

---

## WHAT TO DO (in order)

**0. Commit your repo first.** Many files get replaced. `git add -A && git commit -m "before phase 3-6"`.

**1. Install**

```bash
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities i18next react-i18next
npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @axe-core/playwright
npx playwright install chromium
```

**2. Add scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test",
"i18n:check": "node scripts/check-i18n.mjs",
"update-types": "supabase gen types typescript --project-id YOUR-PROJECT-ID --schema public > src/lib/database.types.ts"
```

(`update-types` with `>` is fine through npm. In Windows PowerShell by hand, use `| Out-File -Encoding utf8` like before.)

**3. SQL. Supabase SQL Editor, use the copy button, run in this order**
1. `sql/phase3_tasks.sql`
2. `sql/phase4_stats.sql`

Then **regenerate types** (`npm run update-types`) and restart the TS server. Skipping this = red squiggles on `room_tasks`, `focus_sessions`, `record_focus_session`.

**4. Copy the files** (same folder layout as `src/`). Marked NEW / CHANGED below. CHANGED files replace yours, so check the diff in git.

**5. Wire 2 things by hand** (I never saw your `main.tsx` or router file)

`main.tsx`: first import line:
```ts
import "./i18n";
```

Router: add the Stats page inside the protected group:
```tsx
import Stats from "./pages/Stats";
// ...
<Route element={<ProtectedLayout />}>
    <Route path="/" element={<Home />} />
    <Route path="/room/:code" element={<Room />} />
    <Route path="/stats" element={<Stats />} />
</Route>
```

**6. Check it builds**
```bash
npm run i18n:check
npx tsc -b
npm test
npm run dev
```
Fix any TS errors from your real shadcn components (see "Not verified").

**7. Manual test pass** (checklists below), then **deploy** (section at the bottom).

---

## FILE MAP

NEW
- `sql/phase3_tasks.sql`, `sql/phase4_stats.sql`
- `src/lib/`: `queryKeys.ts`, `position.ts`, `taskCache.ts`, `stats.ts`, `taskSchemas.ts`, `errorText.ts`, `dateLocale.ts`
- `src/api/`: `tasks.ts`, `stats.ts`
- `src/hooks/`: `useRoomTasks.ts`, `useTaskMutations.ts`
- `src/components/`: `MyTasks.tsx`, `TeamTasks.tsx`, `TaskProgress.tsx`, `FocusChart.tsx`, `TFieldError.tsx`, `LanguageSwitcher.tsx`, `AppHeader.tsx`
- `src/pages/Stats.tsx`
- `src/i18n.ts`, `src/locales/en.json`, `src/locales/ar.json`
- tests: `src/**/*.test.ts(x)`, `src/test/setup.ts`, `vitest.config.ts`, `e2e/*`, `playwright.config.ts`
- `scripts/check-i18n.mjs`, `vercel.json`, `.env.example`, `.github/workflows/ci.yml`

CHANGED (replace yours)
- `src/lib/types.ts` (+2 types), `authSchema.ts` and `roomSchemas.ts` (messages are now translation keys)
- `src/api/rooms.ts` (errors are translation keys)
- `src/hooks/useRoomTimer.ts` (keys moved to `queryKeys.ts`), `useRoomChannel.ts` (+tasks), `useAuthInit.ts` (+clear cache on logout)
- `src/components/RoomTimer.tsx` (+records sessions, +i18n), `ProtectedLayout.tsx`, `GuestLayout.tsx`
- `src/pages/Home.tsx`, `Login.tsx`, `Register.tsx`, `Room.tsx`

NOT touched: `store/*`, `api/timer.ts`, `useCountdown.ts`, `ui/*`, `supabaseClient.ts`.

---

## PHASE 3: tasks (what to review)

Read these in this order:
1. `sql/phase3_tasks.sql`: RLS (read all in room, write only own), lock trigger, cleanup trigger when a member leaves.
2. `lib/taskCache.ts` + test: pure cache helpers. Note "same array back if nothing changed".
3. `lib/position.ts` + test: fractional positions, one row changes per drag, rebalance when gaps get tiny.
4. `hooks/useTaskMutations.ts`: the optimistic recipe + two upgrades (client-made id, only the last mutation refetches).
5. `hooks/useRoomChannel.ts`: realtime echoes are skipped while your own mutation is in flight.
6. `components/MyTasks.tsx`: dnd-kit, keyboard sensor, custom screen reader announcements (titles, not uuids).

Manual tests (2 accounts, incognito for the second):
- Add task: appears instantly. Kill network in DevTools, add another: appears, then disappears with an error.
- Check off / delete: instant. Other account sees it within about a second.
- Drag with mouse AND keyboard (space, arrows, space). Refresh: order stays.
- Account B cannot edit A's tasks. Console test: `supabase.from("room_tasks").update({done:true}).eq("id","<A's task id>")` returns no row.
- B leaves the room: B's tasks vanish for A.
- Add 5 tasks quickly and toggle fast: no flicker, no duplicates.

## PHASE 4: stats (what to review)
1. `sql/phase4_stats.sql`: **the server decides the session length** from the timer row. Read the `if` carefully (3s tolerance, 2 minute window, unique index).
2. `RoomTimer.tsx`: `finishedEndsAt` + `recordedFor` ref = once per finished session.
3. `lib/stats.ts` + test: streak logic (alive if you did not focus yet today).
4. `FocusChart.tsx`: bars hidden from screen readers, real table instead.

Manual tests:
- Host starts a 1 minute timer to test: set it with SQL (`duration_seconds` min is 60): `update public.room_timers set phase='focus', duration_seconds=60, remaining_seconds=60, status='idle', ends_at=null where room_id='...';` then Start.
- At 0:00 both accounts get "Focus session saved". Stats shows +1 session, +1 minute each.
- Two tabs of the same account at 0:00: still ONE session.
- Break phase finishing records nothing.
- Open a room hours after a timer finished: nothing recorded.

## PHASE 5: tests
- `npm test`: 65 unit and component tests (all passed in my sandbox).
- Read `MyTasks.test.tsx`: it freezes the request with a hand-settled promise, so it can assert the optimistic state, then the rollback.
- `npm run e2e`: needs a **separate Supabase project** with Confirm email OFF and the SQL applied. It registers throwaway users. Never point it at your real data.
- `e2e/a11y.spec.ts` may fail at first on your real shadcn components (contrast, labels). Fixing what axe reports is the exercise.

## PHASE 6: accessibility, Arabic/RTL, deploy
Built in: skip link, `<main id="main-content">`, labelled inputs, `role="timer"` with `aria-live="off"`, status regions, a table for the chart, icon buttons with labels, online dot has hidden text, RTL via `<html dir>`, logical Tailwind classes (`ps-`, `end-0`, `rtl:rotate-180`), clock forced `dir="ltr"`.

Manual a11y pass:
- Tab through every page with no mouse. Focus ring always visible? Dialog traps focus?
- Screen reader (NVDA is free): drag a task with the keyboard, listen for the announcements.
- Dark mode contrast on badges and muted text.
- Switch to Arabic on every page: nothing overlaps, arrows point the right way, numbers look right.
- Zoom to 200%: no horizontal scroll.
- **Have a native reader check my Arabic strings** (`ar.json`). You are one. Fix tone and wording freely.

Add new text? Add the key to BOTH json files, run `npm run i18n:check`.

### Deploy checklist
1. Push to GitHub. CI (`.github/workflows/ci.yml`) runs lint, i18n check, tests, build.
2. Vercel: import repo, framework Vite. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. `vercel.json` makes deep links like `/room/ABC123` work on refresh.
3. Supabase, Authentication, URL Configuration: Site URL = your Vercel URL. Add Redirect URLs for localhost and Vercel.
4. Confirm email: OFF is fine for a demo, but anyone can sign up. For real use, turn it ON and set up custom SMTP (built-in email has a tiny limit).
5. Realtime settings: turn off public channel access if the option is there.
6. RLS audit, SQL Editor: `select tablename, rowsecurity from pg_tables where schemaname = 'public';` Every row must say `true`.
7. Search your repo and build output for the secret key. It must appear nowhere.
8. Open the live site in incognito, run the two-account tests again on the real URL.
9. Update your portfolio entry and CV.

---

## Verified vs NOT verified
Verified in a sandbox (real React, TanStack Query, dnd-kit, i18next, Vitest; stand-in UI components and hand-written DB types):
- `tsc --noEmit` clean, 65 tests pass, `i18n:check` passes (149 keys, en and ar match).

NOT verified (I could not run these):
- The SQL. Run it and read errors. If something fails, paste the message to me.
- Playwright specs (typechecked only). Realtime behaviour against a real Supabase.
- Your real shadcn typings (Base UI variant). Props like `size="icon"` or `className` on `Field` could differ. Fix per TS error.
- The Arabic wording, and the look of RTL on every screen.

## Decisions and known limits (good interview material)
- **Positions are floats.** Moving a task updates one row. Rebalance only after many drops in one gap (unit-tested, no drag e2e).
- **Client-made task ids.** Optimistic row and real row are the same row, so no temp-id swap and no duplicates from realtime echoes.
- **Realtime echoes skipped while you mutate.** Last mutation refetches. Rollback restores a snapshot, so the final refetch is what fixes concurrent edits.
- **Postgres Changes DELETE events cannot be filtered by room.** Payload has only the id (default replica identity). Unknown ids are ignored, so the leak is limited to random uuids.
- **Sessions are honour-based on attendance.** The server checks timing and length, not whether you were actually there.
- **A finished timer stays "running" with `ends_at` in the past** until the host resets it. No cron needed.
- **Floating point and `ceil`:** the clock shows `0:01` until it is really done.

## CV bullets (after it works)
- Built a realtime study-room app (React, TypeScript, Supabase): live presence, a server-synchronised timer, and shared task lists with optimistic updates.
- Designed row-level security so rooms are private and every write goes through host- or owner-checked policies and functions.
- Implemented drag-and-drop ordering with keyboard support and screen-reader announcements; added Arabic/RTL localisation.
- Wrote unit, component and end-to-end tests, a CI pipeline, and deployed on Vercel.
