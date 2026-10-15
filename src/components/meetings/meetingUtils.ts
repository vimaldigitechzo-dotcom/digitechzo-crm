/**
 * Meeting Link Validation, Modality Helpers, and WhatsApp Share Formatter
 * Complies with DigiTechzo CRM Meeting / Schedule Demo specifications.
 */

export interface MeetingTimeInfo {
  dateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  durationStr: string;
  startIso: string;
  endIso: string;
}

export interface PlatformInfo {
  isOnline: boolean;
  platformName: string;
  platform: string; // convenient alias for platformName
  headerTitle: string;
  linkPrompt: string;
  normalizedUrl?: string;
  validUrl?: boolean;
}

/**
 * Validates whether an input string is a valid meeting URL (Google Meet, Zoom, MS Teams, Webex, Skype, or valid web URL)
 */
export function isValidMeetingUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  let testUrl = rawUrl.trim();
  if (!testUrl) return false;

  // Auto prepend https if protocol missing for validation testing
  if (!/^https?:\/\//i.test(testUrl)) {
    testUrl = `https://${testUrl}`;
  }

  try {
    const parsed = new URL(testUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    // Host must contain at least one dot, cannot start or end with a dot, and have valid domain characters
    if (!host || !host.includes('.') || host.startsWith('.') || host.endsWith('.')) {
      return false;
    }
    // Check for valid TLD or meeting domain
    const parts = host.split('.');
    if (parts.some((p) => !p || p.length === 0)) return false;
    const tld = parts[parts.length - 1];
    if (tld.length < 2) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes user-entered meeting link by adding https:// if omitted
 */
export function normalizeMeetingUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Detects whether a location string is an online video meeting or physical location,
 * and identifies the video conferencing provider (Google Meet, Zoom, Teams, Webex, etc.).
 */
export function getMeetingPlatformInfo(urlOrLocation?: string): PlatformInfo {
  if (!urlOrLocation || !urlOrLocation.trim()) {
    return {
      isOnline: false,
      platformName: 'In-Person Meeting',
      platform: 'In-Person Meeting',
      headerTitle: 'Meeting Location',
      linkPrompt: 'Location',
      validUrl: false,
    };
  }

  const raw = urlOrLocation.trim();
  const val = raw.toLowerCase();
  const isUrl = /^https?:\/\//i.test(val) || val.startsWith('meet.') || isValidMeetingUrl(raw);
  const normalizedUrl = isUrl ? normalizeMeetingUrl(raw) : undefined;

  let platformName = 'Online Meeting';
  let headerTitle = 'Meeting Joining Info';
  let linkPrompt = 'Video call link';
  let isOnline = true;

  if (val.includes('meet.google.com')) {
    platformName = 'Google Meet';
    headerTitle = 'Google Meet Joining Info';
  } else if (val.includes('zoom.us') || val.includes('zoomgov.com')) {
    platformName = 'Zoom Meeting';
    headerTitle = 'Zoom Meeting Joining Info';
  } else if (val.includes('teams.microsoft.com') || val.includes('teams.live.com') || val.includes('teams.office.com')) {
    platformName = 'Microsoft Teams';
    headerTitle = 'Microsoft Teams Joining Info';
  } else if (val.includes('webex.com')) {
    platformName = 'Cisco Webex';
    headerTitle = 'Webex Meeting Joining Info';
  } else if (val.includes('gotomeet.me') || val.includes('gotomeeting.com')) {
    platformName = 'GoToMeeting';
    headerTitle = 'GoToMeeting Joining Info';
  } else if (val.includes('join.skype.com')) {
    platformName = 'Skype';
    headerTitle = 'Skype Joining Info';
  } else if (isUrl) {
    platformName = 'Online Meeting';
  } else {
    isOnline = false;
    platformName = 'In-Person Meeting';
    headerTitle = 'Meeting Location';
    linkPrompt = 'Location';
  }

  return {
    isOnline,
    platformName,
    platform: platformName,
    headerTitle,
    linkPrompt,
    normalizedUrl,
    validUrl: isUrl,
  };
}

/**
 * Parses duration string (e.g. "45 min", "2 hours", "1 hour", "30 min") into total minutes
 */
export function parseDurationToMinutes(durationStr?: string): number {
  if (!durationStr) return 45;
  const lower = durationStr.toLowerCase().trim();

  // Handle "X hour" or "X hours" (including decimals e.g. "1.5 hours")
  if (lower.includes('hour')) {
    const match = lower.match(/([\d.]+)\s*hour/);
    if (match) {
      const hrs = parseFloat(match[1]);
      if (!isNaN(hrs) && hrs > 0) return Math.round(hrs * 60);
    }
  }

  // Handle "X min" or "X mins" or simple number
  const matchMin = lower.match(/\d+/);
  if (matchMin) {
    const mins = parseInt(matchMin[0], 10);
    if (!isNaN(mins) && mins > 0) return mins;
  }

  return 45;
}

/**
 * Computes exact start and end times, handling AM/PM, midnight/noon rollover, and date boundaries.
 */
export interface CalculatedMeetingTimes {
  formattedDate: string;
  formattedStartTime: string;
  formattedEndTime: string;
  date: string;
  startTime: string;
  endTime: string;
  startDate: Date;
  endDate: Date;
}

export function calculateMeetingTimes(
  dateInput?: string,
  timeInput?: string,
  durationInput?: string,
  startIso?: string,
  endIso?: string
): CalculatedMeetingTimes {
  let startDate: Date;
  let endDate: Date;

  if (startIso && !isNaN(new Date(startIso).getTime())) {
    startDate = new Date(startIso);
    if (endIso && !isNaN(new Date(endIso).getTime())) {
      endDate = new Date(endIso);
    } else {
      const mins = parseDurationToMinutes(durationInput);
      endDate = new Date(startDate.getTime() + mins * 60000);
    }
  } else {
    // Construct from dateInput & timeInput
    const dStr = dateInput || new Date().toISOString().split('T')[0];
    startDate = new Date(`${dStr}T10:00:00`);

    if (timeInput) {
      const match = timeInput.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        const [year, month, day] = dStr.split('-').map((v) => parseInt(v, 10));
        startDate = new Date(year, month - 1, day, h, m, 0, 0);
      }
    }

    const durationMins = parseDurationToMinutes(durationInput);
    endDate = new Date(startDate.getTime() + durationMins * 60000);
  }

  // Format Date: e.g. "Wednesday 14 Sept" matching [Weekday, DD MMM] specification
  const weekday = startDate.toLocaleDateString('en-GB', { weekday: 'long' });
  const day = startDate.getDate();
  const month = startDate.toLocaleDateString('en-GB', { month: 'short' });
  const formattedDate = `${weekday} ${day} ${month}`;

  // Format Time: e.g. "11:30 AM" and "1:30 PM"
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  const formattedStartTime = startDate.toLocaleTimeString('en-US', timeOptions);
  const formattedEndTime = endDate.toLocaleTimeString('en-US', timeOptions);

  return {
    formattedDate,
    formattedStartTime,
    formattedEndTime,
    date: formattedDate,
    startTime: formattedStartTime,
    endTime: formattedEndTime,
    startDate,
    endDate,
  };
}

/**
 * Human-friendly mapping for Session Modality / Meeting Type
 */
export function getSessionModalityLabel(meetingType?: string): string {
  switch ((meetingType || '').toUpperCase()) {
    case 'DEMO':
      return 'Technical Demo';
    case 'DISCOVERY':
      return 'Discovery Session';
    case 'MEETING':
      return 'Commercial Meeting';
    case 'FOLLOW_UP':
      return 'Proposal Review';
    default:
      return meetingType ? meetingType.replace(/_/g, ' ') : 'Client Discussion';
  }
}

/**
 * Generates an automated Google Meet URL in authentic 3-4-3 character format
 * e.g. "https://meet.google.com/iqi-qsmu-muu"
 */
export function generateAutomatedMeetUrl(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const getRand = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${getRand(3)}-${getRand(4)}-${getRand(3)}`;
}

/**
 * Dynamically generates the WhatsApp message matching exact specification:
 *
 * As informed, I’ll be available to meet you all today. I’ve created a Google Meet for the discussion. Sharing the meeting link below, please join at [Start Time].
 *
 * [Meeting Title]
 *
 * [Weekday, Date] • [Start Time] – [End Time]
 *
 * Google Meet joining info  
 * Video call link: [Meeting URL]
 */
export function formatWhatsAppMeetingMessage(meeting: {
  title?: string;
  meetingType?: string;
  date?: string;
  time?: string;
  duration?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  meetingUrl?: string;
  location?: string;
}): string {
  const title = (meeting.title || 'Discussion').trim();
  let urlOrLoc = (meeting.meetingUrl || meeting.location || '').trim();

  // If no URL or location was provided, auto-generate a Google Meet link
  if (!urlOrLoc) {
    urlOrLoc = generateAutomatedMeetUrl();
  }

  const platform = getMeetingPlatformInfo(urlOrLoc);

  const startIso = meeting.startTime
    ? typeof meeting.startTime === 'string'
      ? meeting.startTime
      : meeting.startTime.toISOString()
    : undefined;

  const endIso = meeting.endTime
    ? typeof meeting.endTime === 'string'
      ? meeting.endTime
      : meeting.endTime.toISOString()
    : undefined;

  const times = calculateMeetingTimes(
    meeting.date,
    meeting.time,
    meeting.duration,
    startIso,
    endIso
  );

  let introLine = '';
  let joiningInfoSection = '';

  if (platform.isOnline && urlOrLoc) {
    const finalUrl = normalizeMeetingUrl(urlOrLoc);
    const platformName = platform.platformName === 'Google Meet' ? 'Google Meet' : platform.platformName;
    const headerTitle = platform.platformName === 'Google Meet' ? 'Google Meet joining info' : `${platform.platformName} joining info`;
    introLine = `As informed, I’ll be available to meet you all today. I’ve created a ${platformName} for the discussion. Sharing the meeting link below, please join at ${times.formattedStartTime}.`;
    joiningInfoSection = `${headerTitle}\nVideo call link: ${finalUrl}`;
  } else if (urlOrLoc) {
    introLine = `As informed, I’ll be available to meet you all today. I’ve scheduled a meeting for our discussion. Please join at ${times.formattedStartTime}.`;
    joiningInfoSection = `Meeting location\nLocation: ${urlOrLoc}`;
  } else {
    const autoUrl = generateAutomatedMeetUrl();
    introLine = `As informed, I’ll be available to meet you all today. I’ve created a Google Meet for the discussion. Sharing the meeting link below, please join at ${times.formattedStartTime}.`;
    joiningInfoSection = `Google Meet joining info\nVideo call link: ${autoUrl}`;
  }

  const parts = [
    introLine,
    title,
    `${times.formattedDate} • ${times.formattedStartTime} – ${times.formattedEndTime}`,
  ];

  if (joiningInfoSection) {
    parts.push(joiningInfoSection);
  }

  return parts.join('\n\n');
}

/**
 * Sanitizes phone number for WhatsApp deep-linking
 */
export function cleanPhoneNumberForWhatsApp(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  if (!cleaned) return '';

  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = `91${cleaned}`;
  }

  return cleaned;
}

/**
 * Generates official click-to-chat WhatsApp URL (wa.me)
 */
export function generateWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Opens WhatsApp directly in a new tab with pre-filled message,
 * letting the admin select the contact or group.
 */
export function openWhatsAppShare(meeting: any, _recipientPhone?: string): void {
  const message = formatWhatsAppMeetingMessage(meeting);
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
