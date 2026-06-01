const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';

export type BusyPeriod = {
  start: string; // ISO 8601
  end: string;   // ISO 8601
};

export class CalendarProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 502,
  ) {
    super(message);
    this.name = 'CalendarProviderError';
  }
}

type FreeBusyResponse = {
  calendars?: {
    primary?: {
      busy?: Array<{ start: string; end: string }>;
      errors?: Array<{ domain: string; reason: string }>;
    };
  };
};

/**
 * Calls the Google Calendar FreeBusy API using a Google OAuth provider token.
 * Returns an array of busy intervals for the primary calendar over [timeMin, timeMax].
 *
 * Throws CalendarProviderError on API errors:
 *   - statusCode 401: token expired or invalid
 *   - statusCode 403: insufficient calendar scope
 *   - statusCode 502: any other Google API error
 */
export async function fetchGoogleBusyPeriods(
  providerToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<BusyPeriod[]> {
  const requestBody = {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    items: [{ id: 'primary' }],
  };

  let response: Response;
  try {
    response = await fetch(GOOGLE_FREEBUSY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    throw new CalendarProviderError(
      `Network error contacting Google Calendar API: ${String(networkError)}`,
      502,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new CalendarProviderError(
        'Google Calendar token expired or invalid',
        401,
      );
    }
    if (response.status === 403) {
      throw new CalendarProviderError(
        'Missing Google Calendar permission (calendar.readonly scope required)',
        403,
      );
    }
    const text = await response.text().catch(() => '');
    throw new CalendarProviderError(
      `Google Calendar API error ${response.status}: ${text.slice(0, 200)}`,
      502,
    );
  }

  const data = (await response.json()) as FreeBusyResponse;

  if (data.calendars?.primary?.errors?.length) {
    throw new CalendarProviderError(
      `Google Calendar primary calendar error: ${JSON.stringify(data.calendars.primary.errors)}`,
      502,
    );
  }

  return data.calendars?.primary?.busy ?? [];
}
