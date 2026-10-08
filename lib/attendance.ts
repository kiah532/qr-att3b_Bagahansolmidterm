import { supabase } from './supabase';
import { getEventByCode } from './events';
import { parseQRPayload } from './qr';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type AdminAttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  eventId: string;
  eventCode: string;
  eventTitle: string;
  eventStartTime: string | null;
  eventEndTime: string | null;
  venue: string | null;
  scannedAt: string;
  status: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export async function registerAttendance(
  rawPayload: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return {
      success: false,
      message: parsed.message,
    };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'You must be logged in to register attendance.',
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to verify student role:', profileError);
      return {
        success: false,
        message: 'Could not verify your account role.',
      };
    }

    if (profile?.role !== 'student') {
      return {
        success: false,
        message: 'Only student accounts can record attendance.',
      };
    }

    const event = await getEventByCode(parsed.payload.event);

    if (!event) {
      return {
        success: false,
        message: 'Event not found. Please use a valid event QR code.',
      };
    }

    if (event.status === 'closed') {
      return {
        success: false,
        message: 'This event is closed and is not accepting attendance.',
        eventTitle: event.title,
      };
    }

    const now = Date.now();
    const start = event.start_time
      ? new Date(event.start_time).getTime()
      : null;
    const end = event.end_time
      ? new Date(event.end_time).getTime()
      : null;

    if (start !== null && now < start) {
      return {
        success: false,
        message: 'Event has not started yet.',
        eventTitle: event.title,
      };
    }

    if (end !== null && now > end) {
      return {
        success: false,
        message: 'Event has already ended.',
        eventTitle: event.title,
      };
    }

    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        student_id: user.id,
        event_id: event.id,
      });

    if (attendanceError) {
      if (attendanceError.code === '23505') {
        return {
          success: false,
          message: 'Attendance already recorded for this event.',
          eventTitle: event.title,
        };
      }

      console.error('Failed to record attendance:', attendanceError);
      return {
        success: false,
        message: 'Could not record attendance. Please try again.',
        eventTitle: event.title,
      };
    }

    return {
      success: true,
      message: 'Attendance Recorded Successfully',
      eventTitle: event.title,
    };
  } catch (error) {
    console.error('Failed to validate or record attendance:', error);
    return {
      success: false,
      message: 'Could not verify or record attendance. Please try again.',
    };
  }
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const {
    data,
    error,
  } = await supabase
    .from('attendance')
    .select(`
      id,
      event_id,
      scanned_at,
      events (
        title
      )
    `)
    .eq('student_id', studentId)
    .order('scanned_at', {
      ascending: false,
    });

  if (error || !data) {
    console.error(
      'Failed to load attendance history:',
      error
    );

    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? row.event_id,
    scannedAt: row.scanned_at,
  }));
}

export async function getAdminAttendanceRecords(): Promise<
  AdminAttendanceRecord[]
> {
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select(`
      id,
      student_id,
      event_id,
      scanned_at,
      status,
      events (
        event_code,
        title,
        start_time,
        end_time,
        venue
      )
    `)
    .order('scanned_at', { ascending: false });

  if (attendanceError) {
    throw attendanceError;
  }

  if (!attendance?.length) {
    return [];
  }

  const studentIds = [...new Set(attendance.map((row: any) => row.student_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', studentIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  return attendance.map((row: any) => {
    const event = Array.isArray(row.events)
      ? row.events[0]
      : row.events;
    const student = profilesById.get(row.student_id);

    return {
      id: row.id,
      studentId: row.student_id,
      studentName: student?.full_name ?? null,
      studentEmail: student?.email ?? null,
      eventId: row.event_id,
      eventCode: event?.event_code ?? row.event_id,
      eventTitle: event?.title ?? row.event_id,
      eventStartTime: event?.start_time ?? null,
      eventEndTime: event?.end_time ?? null,
      venue: event?.venue ?? null,
      scannedAt: row.scanned_at,
      status: row.status ?? 'present',
    };
  });
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const {
    data: events,
    error: eventError,
  } = await supabase
    .from('events')
    .select(
      'id, event_code, title, start_time, end_time'
    )
    .eq('created_by', teacherId)
    .order('created_at', {
      ascending: false,
    });

  if (eventError || !events) {
    console.error(
      'Failed to load teacher events:',
      eventError
    );

    return [];
  }

  const eventIds = events.map(
    (event) => event.id
  );

  if (eventIds.length === 0) {
    return [];
  }

  const {
    data: attendance,
    error: attendanceError,
  } = await supabase
    .from('attendance')
    .select(
      'student_id, scanned_at, event_id'
    )
    .in('event_id', eventIds)
    .order('scanned_at', {
      ascending: false,
    });

  if (attendanceError || !attendance) {
    console.error(
      'Failed to load teacher attendance:',
      attendanceError
    );

    return events.map((event) => ({
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: 0,
      attendees: [],
    }));
  }

  return events.map((event) => {
    const rows = attendance.filter(
      (row) => row.event_id === event.id
    );

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: rows.length,
      attendees: rows.map((row) => ({
        studentId: row.student_id,
        scannedAt: row.scanned_at,
      })),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const {
    data: events,
    error: eventError,
  } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', {
      ascending: false,
    });

  if (eventError || !events) {
    console.error(
      'Failed to load teacher event summary:',
      eventError
    );

    return [];
  }

  const eventIds = events.map(
    (event) => event.id
  );

  if (eventIds.length === 0) {
    return [];
  }

  const {
    data: attRows,
    error: attError,
  } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attError || !attRows) {
    console.error(
      'Failed to load attendance counts:',
      attError
    );

    return events.map((event) => ({
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      attendeeCount: 0,
    }));
  }

  const counts: Record<string, number> = {};

  attRows.forEach((row) => {
    counts[row.event_id] =
      (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}