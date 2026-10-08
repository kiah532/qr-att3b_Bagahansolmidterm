import { supabase } from './supabase';

export type EventStatus = 'open' | 'closed';

export type Event = {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
};

export type AdminEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  creatorName?: string;
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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return { error: authError.message };
  }

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

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, event_code, title, start_time, end_time, status, created_by, created_at'
    )
    .eq('event_code', code)
    .maybeSingle();

  if (error) {
    console.error('getEventByCode error:', error);
    return null;
  }

  return data as CloudEvent | null;
}

/**
 * Get all events for the admin page.
 */
export async function getAdminEvents(): Promise<AdminEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(
      `
      id,
      event_code,
      title,
      start_time,
      end_time,
      status,
      created_by,
      created_at
      `
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAdminEvents error:', error);
    throw new Error(error.message);
  }

  const events = data ?? [];
  const creatorIds = [
    ...new Set(
      events
        .map((event) => event.created_by)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (creatorIds.length === 0) {
    return events as AdminEvent[];
  }

  const { data: creators, error: creatorsError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', creatorIds);

  if (creatorsError) {
    console.error('getAdminEvents creator lookup error:', creatorsError);
    throw new Error(creatorsError.message);
  }

  const creatorsById = new Map(
    (creators ?? []).map((creator) => [
      creator.id,
      creator.full_name || creator.email || creator.id,
    ])
  );

  return events.map((event) => ({
    ...event,
    creatorName: event.created_by
      ? creatorsById.get(event.created_by) ?? event.created_by
      : undefined,
  })) as AdminEvent[];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    { count: registeredUsers, error: usersError },
    { count: totalEvents, error: eventsError },
    { count: attendanceScans, error: attendanceError },
    { count: openEvents, error: openEventsError },
    { count: closedEvents, error: closedEventsError },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('attendance').select('id', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'closed'),
  ]);

  const error =
    usersError ||
    eventsError ||
    attendanceError ||
    openEventsError ||
    closedEventsError;

  if (error) {
    console.error('getAdminDashboardStats error:', error);
    throw new Error(error.message);
  }

  return {
    registeredUsers: registeredUsers ?? 0,
    totalEvents: totalEvents ?? 0,
    attendanceScans: attendanceScans ?? 0,
    openEvents: openEvents ?? 0,
    closedEvents: closedEvents ?? 0,
  };
}

export async function getAdminEventAttendanceCounts(): Promise<
  Map<string, number>
> {
  const events = await getAdminEvents();
  const counts = await Promise.all(
    events.map(async (event) => {
      const { count, error } = await supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id);

      if (error) {
        console.error(
          `getAdminEventAttendanceCounts error for ${event.id}:`,
          error
        );
        throw new Error(error.message);
      }

      return [event.id, count ?? 0] as const;
    })
  );

  return new Map(counts);
}

/**
 * Create a new event.
 */
export async function createAdminEvent(
  input: AdminEventInput
): Promise<AdminEvent> {
  // Get currently logged-in user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Auth error:', authError);
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error('You are not logged in. Please log in again.');
  }

  // Basic validation
  if (!input.title.trim()) {
    throw new Error('Event title is required.');
  }

  if (!input.eventCode.trim()) {
    throw new Error('Event code is required.');
  }

  // Check if event code already exists
  const { data: existingEvent, error: existingError } = await supabase
    .from('events')
    .select('id')
    .eq('event_code', input.eventCode.trim())
    .maybeSingle();

  if (existingError) {
    console.error('Checking event code error:', existingError);
    throw new Error(existingError.message);
  }

  if (existingEvent) {
    throw new Error(
      `Event code "${input.eventCode.trim()}" already exists. Please use another code.`
    );
  }

  // Insert event
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: input.title.trim(),
      event_code: input.eventCode.trim(),
      start_time: input.startTime,
      end_time: input.endTime,
      status: 'open',
      created_by: user.id,
    })
    .select(
      `
      id,
      event_code,
      title,
      start_time,
      end_time,
      status,
      created_by,
      created_at
      `
    )
    .single();

  if (error) {
    console.error('CREATE EVENT SUPABASE ERROR:', error);

    throw new Error(
      `Could not create event: ${error.message}`
    );
  }

  if (!data) {
    throw new Error('Event was not created.');
  }

  return data as AdminEvent;
}

/**
 * Update an existing event.
 */
export async function updateAdminEvent(
  eventId: string,
  input: AdminEventInput
): Promise<AdminEvent> {
  if (!eventId) {
    throw new Error('Event ID is missing.');
  }

  if (!input.title.trim()) {
    throw new Error('Event title is required.');
  }

  if (!input.eventCode.trim()) {
    throw new Error('Event code is required.');
  }

  // Check whether another event already uses this code
  const { data: existingEvent, error: existingError } = await supabase
    .from('events')
    .select('id')
    .eq('event_code', input.eventCode.trim())
    .neq('id', eventId)
    .maybeSingle();

  if (existingError) {
    console.error('Checking duplicate event code:', existingError);
    throw new Error(existingError.message);
  }

  if (existingEvent) {
    throw new Error(
      `Event code "${input.eventCode.trim()}" is already being used.`
    );
  }

  const { data, error } = await supabase
    .from('events')
    .update({
      title: input.title.trim(),
      event_code: input.eventCode.trim(),
      start_time: input.startTime,
      end_time: input.endTime,
    })
    .eq('id', eventId)
    .select(
      `
      id,
      event_code,
      title,
      start_time,
      end_time,
      status,
      created_by,
      created_at
      `
    )
    .single();

  if (error) {
    console.error('UPDATE EVENT ERROR:', error);
    throw new Error(`Could not update event: ${error.message}`);
  }

  if (!data) {
    throw new Error('Event was not updated.');
  }

  return data as AdminEvent;
}

/**
 * Close or reopen an event.
 */
export async function setAdminEventStatus(
  eventId: string,
  status: EventStatus
): Promise<AdminEvent> {
  if (!eventId) {
    throw new Error('Event ID is missing.');
  }

  const { data, error } = await supabase
    .from('events')
    .update({
      status,
    })
    .eq('id', eventId)
    .select(
      `
      id,
      event_code,
      title,
      start_time,
      end_time,
      status,
      created_by,
      created_at
      `
    )
    .single();

  if (error) {
    console.error('SET EVENT STATUS ERROR:', error);
    throw new Error(`Could not update event status: ${error.message}`);
  }

  if (!data) {
    throw new Error('Event status was not updated.');
  }

  return data as AdminEvent;
}

/**
 * Delete an event.
 */
export async function deleteAdminEvent(
  eventId: string
): Promise<void> {
  if (!eventId) {
    throw new Error('Event ID is missing.');
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('DELETE EVENT ERROR:', error);
    throw new Error(`Could not delete event: ${error.message}`);
  }
}