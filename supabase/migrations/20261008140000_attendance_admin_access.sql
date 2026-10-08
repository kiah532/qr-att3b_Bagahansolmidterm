-- Extend the existing attendance schema for student check-ins and admin reads.
-- Existing attendance/events/profiles tables are reused.

alter table public.attendance
  add column if not exists status text not null default 'present';

alter table public.events
  add column if not exists venue text;

-- Keep the role constraint compatible with the application's admin accounts.
do $$
declare
  role_check record;
begin
  for role_check in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format(
      'alter table public.profiles drop constraint %I',
      role_check.conname
    );
  end loop;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('student', 'teacher', 'admin'));
end
$$;

-- Link attendance directly to profiles so each record requires a real profile.
do $$
declare
  student_fk record;
begin
  for student_fk in
    select distinct constraint_row.conname
    from pg_constraint constraint_row
    join unnest(constraint_row.conkey) as key_column(attnum) on true
    join pg_attribute column_row
      on column_row.attrelid = constraint_row.conrelid
      and column_row.attnum = key_column.attnum
    where constraint_row.conrelid = 'public.attendance'::regclass
      and constraint_row.contype = 'f'
      and column_row.attname = 'student_id'
  loop
    execute format(
      'alter table public.attendance drop constraint %I',
      student_fk.conname
    );
  end loop;

  alter table public.attendance
    add constraint attendance_student_id_fkey
    foreign key (student_id)
    references public.profiles (id)
    on delete cascade;
end
$$;

-- The repository schema already has this unique constraint. Add an index only
-- when the deployed database does not already enforce the same key.
do $$
begin
  if not exists (
    select 1
    from pg_index index_row
    join pg_class table_row on table_row.oid = index_row.indrelid
    where table_row.oid = 'public.attendance'::regclass
      and index_row.indisunique
      and index_row.indpred is null
      and (
        (
          select array_agg(attribute_row.attname::text order by key_row.ordinality)
          from unnest(index_row.indkey) with ordinality
            as key_row(attnum, ordinality)
          join pg_attribute attribute_row
            on attribute_row.attrelid = index_row.indrelid
            and attribute_row.attnum = key_row.attnum
          where key_row.ordinality <= index_row.indnkeyatts
        ) = array['student_id', 'event_id']::text[]
        or (
          select array_agg(attribute_row.attname::text order by key_row.ordinality)
          from unnest(index_row.indkey) with ordinality
            as key_row(attnum, ordinality)
          join pg_attribute attribute_row
            on attribute_row.attrelid = index_row.indrelid
            and attribute_row.attnum = key_row.attnum
          where key_row.ordinality <= index_row.indnkeyatts
        ) = array['event_id', 'student_id']::text[]
      )
  ) then
    create unique index attendance_student_event_unique_idx
      on public.attendance (student_id, event_id);
  end if;
end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Server-side enforcement prevents clients from spoofing a student ID,
-- status, or scan timestamp, and validates the stored event schedule.
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

  select start_time, end_time
    into event_start, event_end
    from public.events
    where id = new.event_id;

  if not found then
    raise exception 'Attendance event does not exist';
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

revoke all on function public.enforce_student_attendance_checkin() from public;
drop trigger if exists enforce_student_attendance_checkin
  on public.attendance;
create trigger enforce_student_attendance_checkin
  before insert on public.attendance
  for each row
  execute function public.enforce_student_attendance_checkin();

-- Students may only see their records and insert a record as themselves.
drop policy if exists "Students can insert their own attendance"
  on public.attendance;
create policy "Students can insert their own attendance"
  on public.attendance
  for insert
  with check (
    auth.uid() = student_id
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'student'
    )
  );

drop policy if exists "Admins can view all attendance"
  on public.attendance;
create policy "Admins can view all attendance"
  on public.attendance
  for select
  using (public.is_admin());

drop policy if exists "Admins can view all profiles"
  on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.is_admin());
