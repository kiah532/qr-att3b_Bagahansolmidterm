-- Add the OPEN/CLOSED state required by the Admin Events screen.
alter table public.events
  add column if not exists status text not null default 'open';

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (status in ('open', 'closed'));

alter table public.events enable row level security;

-- Reject direct student check-ins after an administrator closes an event.
create or replace function public.enforce_student_attendance_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text;
  event_start timestamptz;
  event_end timestamptz;
  event_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select role
    into current_role
    from public.profiles
    where id = auth.uid();

  if current_role is distinct from 'student' then
    raise exception 'Only student accounts can record attendance';
  end if;

  select start_time, end_time, status
    into event_start, event_end, event_status
    from public.events
    where id = new.event_id;

  if not found then
    raise exception 'Attendance event does not exist';
  end if;

  if event_status = 'closed' then
    raise exception 'Event is closed and is not accepting attendance';
  end if;

  if event_start is not null and now() < event_start then
    raise exception 'Event has not started yet';
  end if;

  if event_end is not null and now() > event_end then
    raise exception 'Event has already ended';
  end if;

  new.student_id := auth.uid();
  new.scanned_at := now();
  new.status := 'present';
  return new;
end;
$$;

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events"
  on public.events
  for insert
  with check (
    public.is_admin()
    and auth.uid() = created_by
  );

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events
  for delete
  using (public.is_admin());
