export const leagueNameMap: Record<string, string> = {
  mlb: 'MLB',
  baseball: 'MLB',
  nba: 'NBA',
  wnba: 'WNBA',
  nhl: 'NHL',
  hockey: 'NHL',
  nfl: 'NFL',
  cfb: 'College Football',
  collegefootball: 'College Football',
  ncaab: 'NCAAB',
  soccer: 'Soccer',
  futbol: 'Soccer',
  ufc: 'UFC',
  boxing: 'Boxing',
  f1: 'F1',
  wwe: 'WWE',
  'other-events': 'Other events'
};

export function normalizeString(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function parseSupportedLeague(value: any): string | null {
  if (!value || typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw.length) return null;

  const path = raw.replace(/\\+/g, '/').replace(/^\/+|\/+$/g, '');
  const parts = path.split('/').filter(Boolean);

  for (const rawPart of parts) {
    const normalized = normalizeString(rawPart);
    if (!normalized) continue;

    const key = normalized.toLowerCase().replace(/[-_ ]+/g, '-');
    if (leagueNameMap[key]) {
      return leagueNameMap[key];
    }

    const cleaned = normalized.toLowerCase().replace(/[-_ ]+/g, '');
    if (leagueNameMap[cleaned]) {
      return leagueNameMap[cleaned];
    }

    for (const subPart of normalized.toLowerCase().split(/[-_ ]+/)) {
      if (leagueNameMap[subPart]) {
        return leagueNameMap[subPart];
      }
    }
  }

  return null;
}

export function parseLeagueFromEspnPath(value: any): string | null {
  return parseSupportedLeague(value);
}

export function parseLeagueFromUrl(value: any, baseUrl?: string): string | null {
  if (!value || typeof value !== 'string') return null;

  try {
    const url = new URL(value, baseUrl || (typeof location !== 'undefined' ? location.href : 'http://localhost'));
    return parseSupportedLeague(url.pathname);
  } catch {
    return parseSupportedLeague(value);
  }
}

export function formatUnixTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function parseStartTime(timestamp: number): string {
  const diffMinutes = Math.round((timestamp * 1000 - Date.now()) / 60000);
  if (diffMinutes <= 0) {
    return 'Starts soon';
  }
  if (diffMinutes < 1) {
    return 'Starts in a moment';
  }
  if (diffMinutes < 60) {
    return `Starts in ${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours <= 4) {
    return minutes ? `Starts in ${hours}h ${minutes}m` : `Starts in ${hours}h`;
  }

  return `Starts at ${formatUnixTimestamp(timestamp)}`;
}

export function parseStreamStatusFromSE(se: any): string | null {
  if (!se || typeof se !== 'object') return null;

  if (se.showEndedScreen) {
    return 'Final';
  }

  if (typeof se.timeUntilStart === 'number') {
    if (se.timeUntilStart > 0) {
      const timestamp = Math.round(Date.now() / 1000 + se.timeUntilStart);
      return parseStartTime(timestamp);
    }

    if (se.showCountdown) {
      return 'Starts soon';
    }
  }

  if (typeof se.matchStartTime === 'number' && se.matchStartTime > Math.round(Date.now() / 1000)) {
    return parseStartTime(se.matchStartTime);
  }

  return null;
}

export function getSupportedStreamLeague(se: any): string | null {
  return (
    parseSupportedLeague(se.sportName || '') ||
    parseSupportedLeague(se.sport || '') ||
    parseSupportedLeague(se.league || '') ||
    parseSupportedLeague(se.espnPath || '') ||
    parseSupportedLeague(se.path || '') ||
    parseSupportedLeague(typeof location !== 'undefined' ? location.pathname : '')
  );
}

export function formatLeagueStatus(rawStatus: string, league?: string | null): string {
  const status = normalizeString(rawStatus);
  if (!status) return '';

  const normalized = status.toLowerCase();
  const leagueKey = league?.toLowerCase() || '';

  if (/^(live|live now)$/i.test(status)) {
    return 'Live now';
  }

  if (/^(final|ft|full[- ]time|ended|end)$/i.test(normalized)) {
    return 'Final';
  }

  if (/^(ht|half[- ]time)$/i.test(normalized)) {
    return 'Half time';
  }

  if (/^(et|extra time)$/i.test(normalized)) {
    return 'Extra time';
  }

  if (/^(postponed|cancelled|canceled|delayed|suspended)$/i.test(normalized)) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  if (/^(\d+(\+\d+)?)'$/i.test(status)) {
    return `${status} minute`;
  }

  if (/^(\d{1,2}m)$/i.test(status)) {
    return `${status} minute`;
  }

  if (/^(top|bot|mid)\s+\d+(st|nd|rd|th)?$/i.test(status)) {
    return `${status} inning`;
  }

  const qMatch = status.match(/^q([1-4])$/i);
  if (qMatch) {
    const quarter = Number(qMatch[1]);
    const suffix = ['st', 'nd', 'rd', 'th'][quarter - 1] || 'th';
    return `${quarter}${suffix} quarter`;
  }

  if (/^(1st|2nd|3rd|4th)\s+quarter$/i.test(status)) {
    return `${status}`;
  }

  const halfMatch = status.match(/^([12])h$/i);
  if (halfMatch) {
    const half = Number(halfMatch[1]);
    const suffix = half === 1 ? 'st' : 'nd';
    return `${half}${suffix} half`;
  }

  if (/^(1st|2nd|3rd|4th)$/i.test(status)) {
    if (/(nba|wnba|ncaab|basketball)/i.test(leagueKey)) {
      return `${status} quarter`;
    }
    if (/(nfl|cfb|college football|football)/i.test(leagueKey)) {
      return `${status} quarter`;
    }
    if (/(nhl|hockey)/i.test(leagueKey)) {
      return `${status} period`;
    }
    if (/(soccer|football|futbol)/i.test(leagueKey)) {
      return `${status} half`;
    }
    return status;
  }

  if (/^(1st|2nd)\s+half$/i.test(status)) {
    return `${status}`;
  }

  if (/^(ot|aot)$/i.test(status)) {
    return 'Overtime';
  }

  if (/^so$/i.test(status)) {
    return 'Shootout';
  }

  return status;
}
