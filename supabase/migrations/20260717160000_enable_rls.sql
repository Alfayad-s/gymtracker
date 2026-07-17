-- GymTrack Row Level Security
-- User-owned rows are private. Built-in exercise catalog rows (user_id is null)
-- and exercise categories remain readable as shared reference data.

alter table public.profiles enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_days enable row level security;
alter table public.exercise_categories enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_day_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.exercise_sets enable row level security;
alter table public.body_measurements enable row level security;
alter table public.personal_records enable row level security;
alter table public.notifications enable row level security;
alter table public.user_app_sync enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

-- Workout plans. A null user_id represents an optional shared template.
drop policy if exists "workout_plans_select_accessible" on public.workout_plans;
create policy "workout_plans_select_accessible"
on public.workout_plans for select
to authenticated
using (user_id is null or (select auth.uid()) = user_id);

drop policy if exists "workout_plans_insert_own" on public.workout_plans;
create policy "workout_plans_insert_own"
on public.workout_plans for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plans_update_own" on public.workout_plans;
create policy "workout_plans_update_own"
on public.workout_plans for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "workout_plans_delete_own" on public.workout_plans;
create policy "workout_plans_delete_own"
on public.workout_plans for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Workout days inherit access from their plan.
drop policy if exists "workout_days_select_accessible" on public.workout_days;
create policy "workout_days_select_accessible"
on public.workout_days for select
to authenticated
using (
  exists (
    select 1
    from public.workout_plans plan
    where plan.id = workout_days.plan_id
      and (plan.user_id is null or plan.user_id = (select auth.uid()))
  )
);

drop policy if exists "workout_days_insert_own" on public.workout_days;
create policy "workout_days_insert_own"
on public.workout_days for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_plans plan
    where plan.id = workout_days.plan_id
      and plan.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_days_update_own" on public.workout_days;
create policy "workout_days_update_own"
on public.workout_days for update
to authenticated
using (
  exists (
    select 1
    from public.workout_plans plan
    where plan.id = workout_days.plan_id
      and plan.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_plans plan
    where plan.id = workout_days.plan_id
      and plan.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_days_delete_own" on public.workout_days;
create policy "workout_days_delete_own"
on public.workout_days for delete
to authenticated
using (
  exists (
    select 1
    from public.workout_plans plan
    where plan.id = workout_days.plan_id
      and plan.user_id = (select auth.uid())
  )
);

-- Shared exercise reference data.
drop policy if exists "exercise_categories_read_all" on public.exercise_categories;
create policy "exercise_categories_read_all"
on public.exercise_categories for select
to anon, authenticated
using (true);

drop policy if exists "exercises_select_accessible" on public.exercises;
create policy "exercises_select_accessible"
on public.exercises for select
to anon, authenticated
using (user_id is null or (select auth.uid()) = user_id);

drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own"
on public.exercises for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own"
on public.exercises for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "exercises_delete_own" on public.exercises;
create policy "exercises_delete_own"
on public.exercises for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Planned exercises inherit ownership through day -> plan.
drop policy if exists "workout_day_exercises_select_accessible" on public.workout_day_exercises;
create policy "workout_day_exercises_select_accessible"
on public.workout_day_exercises for select
to authenticated
using (
  exists (
    select 1
    from public.workout_days day
    join public.workout_plans plan on plan.id = day.plan_id
    where day.id = workout_day_exercises.day_id
      and (plan.user_id is null or plan.user_id = (select auth.uid()))
  )
);

drop policy if exists "workout_day_exercises_insert_own" on public.workout_day_exercises;
create policy "workout_day_exercises_insert_own"
on public.workout_day_exercises for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_days day
    join public.workout_plans plan on plan.id = day.plan_id
    where day.id = workout_day_exercises.day_id
      and plan.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_day_exercises_update_own" on public.workout_day_exercises;
create policy "workout_day_exercises_update_own"
on public.workout_day_exercises for update
to authenticated
using (
  exists (
    select 1
    from public.workout_days day
    join public.workout_plans plan on plan.id = day.plan_id
    where day.id = workout_day_exercises.day_id
      and plan.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_days day
    join public.workout_plans plan on plan.id = day.plan_id
    where day.id = workout_day_exercises.day_id
      and plan.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_day_exercises_delete_own" on public.workout_day_exercises;
create policy "workout_day_exercises_delete_own"
on public.workout_day_exercises for delete
to authenticated
using (
  exists (
    select 1
    from public.workout_days day
    join public.workout_plans plan on plan.id = day.plan_id
    where day.id = workout_day_exercises.day_id
      and plan.user_id = (select auth.uid())
  )
);

-- Workout sessions
drop policy if exists "workout_sessions_select_own" on public.workout_sessions;
create policy "workout_sessions_select_own"
on public.workout_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own"
on public.workout_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own"
on public.workout_sessions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "workout_sessions_delete_own" on public.workout_sessions;
create policy "workout_sessions_delete_own"
on public.workout_sessions for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Workout exercises inherit ownership from their session.
drop policy if exists "workout_exercises_select_own" on public.workout_exercises;
create policy "workout_exercises_select_own"
on public.workout_exercises for select
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions session
    where session.id = workout_exercises.session_id
      and session.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_exercises_insert_own" on public.workout_exercises;
create policy "workout_exercises_insert_own"
on public.workout_exercises for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_sessions session
    where session.id = workout_exercises.session_id
      and session.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_exercises_update_own" on public.workout_exercises;
create policy "workout_exercises_update_own"
on public.workout_exercises for update
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions session
    where session.id = workout_exercises.session_id
      and session.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_sessions session
    where session.id = workout_exercises.session_id
      and session.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_exercises_delete_own" on public.workout_exercises;
create policy "workout_exercises_delete_own"
on public.workout_exercises for delete
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions session
    where session.id = workout_exercises.session_id
      and session.user_id = (select auth.uid())
  )
);

-- Exercise sets inherit ownership through workout exercise -> session.
drop policy if exists "exercise_sets_select_own" on public.exercise_sets;
create policy "exercise_sets_select_own"
on public.exercise_sets for select
to authenticated
using (
  exists (
    select 1
    from public.workout_exercises workout_exercise
    join public.workout_sessions session on session.id = workout_exercise.session_id
    where workout_exercise.id = exercise_sets.workout_exercise_id
      and session.user_id = (select auth.uid())
  )
);

drop policy if exists "exercise_sets_insert_own" on public.exercise_sets;
create policy "exercise_sets_insert_own"
on public.exercise_sets for insert
to authenticated
with check (
  exists (
    select 1
    from public.workout_exercises workout_exercise
    join public.workout_sessions session on session.id = workout_exercise.session_id
    where workout_exercise.id = exercise_sets.workout_exercise_id
      and session.user_id = (select auth.uid())
  )
);

drop policy if exists "exercise_sets_update_own" on public.exercise_sets;
create policy "exercise_sets_update_own"
on public.exercise_sets for update
to authenticated
using (
  exists (
    select 1
    from public.workout_exercises workout_exercise
    join public.workout_sessions session on session.id = workout_exercise.session_id
    where workout_exercise.id = exercise_sets.workout_exercise_id
      and session.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_exercises workout_exercise
    join public.workout_sessions session on session.id = workout_exercise.session_id
    where workout_exercise.id = exercise_sets.workout_exercise_id
      and session.user_id = (select auth.uid())
  )
);

drop policy if exists "exercise_sets_delete_own" on public.exercise_sets;
create policy "exercise_sets_delete_own"
on public.exercise_sets for delete
to authenticated
using (
  exists (
    select 1
    from public.workout_exercises workout_exercise
    join public.workout_sessions session on session.id = workout_exercise.session_id
    where workout_exercise.id = exercise_sets.workout_exercise_id
      and session.user_id = (select auth.uid())
  )
);

-- Direct user-owned tables
drop policy if exists "body_measurements_manage_own" on public.body_measurements;
create policy "body_measurements_manage_own"
on public.body_measurements for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "personal_records_manage_own" on public.personal_records;
create policy "personal_records_manage_own"
on public.personal_records for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_manage_own" on public.notifications;
create policy "notifications_manage_own"
on public.notifications for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_app_sync_manage_own" on public.user_app_sync;
create policy "user_app_sync_manage_own"
on public.user_app_sync for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
