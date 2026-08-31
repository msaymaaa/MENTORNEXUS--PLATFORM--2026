import { useState, useEffect } from 'react';

/**
 * Parses date string (e.g. "2026-08-27" or ISO) and optional time string (e.g. "10:00 AM PST", "14:30", "10:00 AM")
 * into a valid JavaScript Date object.
 */
export function parseMeetingDateTime(dateStr: string, timeStr?: string): Date {
  if (!dateStr) return new Date();

  // If dateStr is already full ISO
  if (dateStr.includes('T') || dateStr.length > 15) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const fallback = new Date(dateStr);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  let hours = 10;
  let minutes = 0;

  if (timeStr) {
    // Clean string: e.g. "10:00 AM PST" -> "10:00 AM"
    const cleaned = timeStr.trim();
    const isPM = /pm/i.test(cleaned);
    const isAM = /am/i.test(cleaned);

    const match = cleaned.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      hours = h;
      minutes = m;
    } else {
      const singleHour = cleaned.match(/(\d{1,2})\s*(am|pm)/i);
      if (singleHour) {
        let h = parseInt(singleHour[1], 10);
        if (/pm/i.test(singleHour[2]) && h < 12) h += 12;
        if (/am/i.test(singleHour[2]) && h === 12) h = 0;
        hours = h;
      }
    }
  }

  return new Date(year, month, day, hours, minutes, 0);
}

export interface MeetingCountdownResult {
  label: string;
  status: 'live' | 'starting_soon' | 'upcoming' | 'recently_started' | 'past' | 'cancelled' | 'completed';
  badgeColor: string;
  isUrgent: boolean;
  formattedDateTime: string;
}

/**
 * Calculates live relative countdown or status for a meeting.
 */
export function getMeetingCountdown(
  dateStr: string,
  timeStr?: string,
  meetingStatus?: 'scheduled' | 'completed' | 'cancelled'
): MeetingCountdownResult {
  if (meetingStatus === 'completed') {
    return {
      label: 'Session Completed',
      status: 'completed',
      badgeColor: 'bg-[#10B981]/20 text-[#34D399] border-[#10B981]/40',
      isUrgent: false,
      formattedDateTime: formatDisplayDate(dateStr, timeStr),
    };
  }

  if (meetingStatus === 'cancelled') {
    return {
      label: 'Session Cancelled',
      status: 'cancelled',
      badgeColor: 'bg-[#E11D48]/20 text-[#FB7185] border-[#E11D48]/40',
      isUrgent: false,
      formattedDateTime: formatDisplayDate(dateStr, timeStr),
    };
  }

  const meetingDate = parseMeetingDateTime(dateStr, timeStr);
  const now = new Date();
  const diffMs = meetingDate.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formattedDateTime = formatDisplayDate(dateStr, timeStr);

  // Starting now (between 5 min before and 5 min after start)
  if (diffMinutes >= -5 && diffMinutes <= 5) {
    return {
      label: 'Starting now',
      status: 'live',
      badgeColor: 'bg-[#10B981] text-[#090A0F] font-bold animate-pulse border-[#10B981]',
      isUrgent: true,
      formattedDateTime,
    };
  }

  // Started recently (5 to 45 mins ago)
  if (diffMinutes < -5 && diffMinutes >= -45) {
    const elapsed = Math.abs(diffMinutes);
    return {
      label: `Started ${elapsed} min${elapsed === 1 ? '' : 's'} ago`,
      status: 'recently_started',
      badgeColor: 'bg-[#D4AF37]/30 text-[#F5F2EB] border-[#D4AF37]/60 font-semibold',
      isUrgent: true,
      formattedDateTime,
    };
  }

  // Started more than 45 mins ago -> past
  if (diffMinutes < -45) {
    if (diffDays <= -1) {
      const daysAgo = Math.abs(diffDays);
      return {
        label: daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`,
        status: 'past',
        badgeColor: 'bg-[#262A3C] text-[#9E9A90] border-[#343A52]',
        isUrgent: false,
        formattedDateTime,
      };
    }
    const hoursAgo = Math.abs(diffHours);
    return {
      label: `Ended ${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`,
      status: 'past',
      badgeColor: 'bg-[#262A3C] text-[#9E9A90] border-[#343A52]',
      isUrgent: false,
      formattedDateTime,
    };
  }

  // Starts in less than 60 minutes
  if (diffMinutes > 5 && diffMinutes <= 59) {
    return {
      label: `Starts in ${diffMinutes} min${diffMinutes === 1 ? '' : 's'}`,
      status: 'starting_soon',
      badgeColor: 'bg-[#D4AF37]/25 text-[#E6C258] border-[#D4AF37]/50 font-bold',
      isUrgent: true,
      formattedDateTime,
    };
  }

  // Starts in 1 to 23 hours
  if (diffHours >= 1 && diffHours < 24) {
    return {
      label: `Starts in ${diffHours} hour${diffHours === 1 ? '' : 's'}`,
      status: 'upcoming',
      badgeColor: 'bg-[#181B28] text-[#D4AF37] border-[#343A52]',
      isUrgent: false,
      formattedDateTime,
    };
  }

  // Starts in 1+ days
  if (diffDays === 1) {
    return {
      label: 'Starts tomorrow',
      status: 'upcoming',
      badgeColor: 'bg-[#181B28] text-[#9E9A90] border-[#262A3C]',
      isUrgent: false,
      formattedDateTime,
    };
  }

  return {
    label: `Starts in ${diffDays} days`,
    status: 'upcoming',
    badgeColor: 'bg-[#181B28] text-[#9E9A90] border-[#262A3C]',
    isUrgent: false,
    formattedDateTime,
  };
}

function formatDisplayDate(dateStr: string, timeStr?: string): string {
  try {
    const d = parseMeetingDateTime(dateStr, timeStr);
    const dateFormatted = d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
    const timeFormatted = timeStr || d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateFormatted} at ${timeFormatted}`;
  } catch {
    return `${dateStr} ${timeStr || ''}`.trim();
  }
}

/**
 * Custom hook to trigger auto-updates for relative countdowns every 10 seconds.
 */
export function useMeetingTimer(intervalMs: number = 10000): number {
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return tick;
}
