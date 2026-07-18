-- Body composition (InBody / BIA) reports
alter table if exists public.body_composition_reports enable row level security;

drop policy if exists "body_composition_reports_manage_own" on public.body_composition_reports;
create policy "body_composition_reports_manage_own"
on public.body_composition_reports for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
