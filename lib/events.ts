import { supabase } from '@/lib/supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  venue?: string | null;
  status?: 'open' | 'closed';
  created_by: string | null;
  created_at: string;
};

export type AdminEvent = CloudEvent & {
  status: 'open' | 'closed';
  creatorName: string | null;
};

export type AdminEventInput = {
  title: string;
  eventCode: string;
  startTime: string | null;
  endTime: string | null;
};

export type AdminDashboardStats = {
  registeredUsers: number;
  totalEvents: number;
  attendanceScans: number;
  openEvents: number;
  closedEvents: number;
};

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('events').upsert(
    {
      event_code: event.eventId,
      title: event.title,
      start_time: event.start || null,
      end_time: event.end || null,
      created_by: user?.id ?? null,
    },
    { onConflict: 'event_code' }
  );

  return { error: error?.message ?? null };
}

export async function getAdminEvents(): Promise<AdminEvent[]> {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time, status, created_by, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!events?.length) {
    return [];
  }

  const creatorIds = [
    ...new Set(
      events
        .map((event) => event.created_by)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: creators, error: creatorError } = creatorIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds)
    : { data: [], error: null };

  if (creatorError) {
    throw creatorError;
  }

  const creatorsById = new Map(
    (creators ?? []).map((creator) => [
      creator.id,
      creator.full_name || creator.email,
    ])
  );

  return events.map((event) => ({
    ...event,
    status: event.status === 'closed' ? 'closed' : 'open',
    creatorName: event.created_by
      ? creatorsById.get(event.created_by) ?? null
      : null,
  }));
}

export async function createAdminEvent(
  input: AdminEventInput
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }
  if (!user) {
    throw new Error('Sign in to create an event.');
  }

  const { error } = await supabase.from('events').insert({
    event_code: input.eventCode.trim(),
    title: input.title.trim(),
    start_time: input.startTime,
    end_time: input.endTime,
    created_by: user.id,
    status: 'open',
  });

  if (error) {
    throw error;
  }
}

export async function updateAdminEvent(
  eventId: string,
  input: AdminEventInput
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({
      event_code: input.eventCode.trim(),
      title: input.title.trim(),
      start_time: input.startTime,
      end_time: input.endTime,
    })
    .eq('id', eventId);

  if (error) {
    throw error;
  }
}

export async function setAdminEventStatus(
  eventId: string,
  status: 'open' | 'closed'
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (error) {
    throw error;
  }
}

export async function deleteAdminEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    throw error;
  }
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    usersResult,
    totalEventsResult,
    openEventsResult,
    closedEventsResult,
    attendanceResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'closed'),
    supabase.from('attendance').select('id', { count: 'exact', head: true }),
  ]);

  if (usersResult.error) throw usersResult.error;
  if (totalEventsResult.error) throw totalEventsResult.error;
  if (openEventsResult.error) throw openEventsResult.error;
  if (closedEventsResult.error) throw closedEventsResult.error;
  if (attendanceResult.error) throw attendanceResult.error;

  return {
    registeredUsers: usersResult.count ?? 0,
    totalEvents: totalEventsResult.count ?? 0,
    attendanceScans: attendanceResult.count ?? 0,
    openEvents: openEventsResult.count ?? 0,
    closedEvents: closedEventsResult.count ?? 0,
  };
}

export async function getAdminEventAttendanceCounts(): Promise<
  Map<string, number>
> {
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id');

  if (eventsError) {
    throw eventsError;
  }

  const counts = new Map<string, number>();
  const results = await Promise.all(
    (events ?? []).map(async ({ id }) => {
      const { count, error } = await supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', id);
      if (error) throw error;
      return [id, count ?? 0] as const;
    })
  );

  results.forEach(([id, count]) => counts.set(id, count));
  return counts;
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as CloudEvent;
}