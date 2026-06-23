import {
  formatLeagueStatus,
  getSupportedStreamLeague,
  normalizeString,
  parseStartTime,
  parseStreamStatusFromSE,
  parseSupportedLeague
} from './utils';

const presence = new Presence({ clientId: '1441489442484256961' });

interface MatchInfo {
  homeTeam: string;
  awayTeam: string;
  status?: string;
  homeScore?: string;
  awayScore?: string;
  league?: string;
  url?: string;
  startTimestamp?: number;
}

interface Settings {
  privacyMode: boolean;
  hideScores: boolean;
}

const leagueSportAssets: Record<string, string> = {
  'MLB': 'streameast_baseball',
  'NBA': 'streameast_basketball',
  'WNBA': 'streameast_basketball',
  'NCAAB': 'streameast_basketball',
  'NFL': 'streameast_football',
  'College Football': 'streameast_football',
  'NHL': 'streameast_hockey',
  'Soccer': 'streameast_soccer',
  'UFC': 'streameast_mma',
  'Boxing': 'streameast_boxing',
  'F1': 'streameast_racing'
};

function getSportAssetKey(league?: string): string {
  return (league && leagueSportAssets[league]) || 'streameast';
}

// TheSportsDB (free public key '3') is used as the primary team logo source.
// It returns PNG badges explicitly designed for embedding, with CORS enabled.
// One bulk call per league fetches all teams at once; results are cached.
// ESPN is kept as a fallback but any SVG URLs are filtered out since
// Discord's image proxy only accepts raster formats (PNG/JPEG/WEBP).
const tsdbLeagueNames: Record<string, string> = {
  'MLB': 'MLB',
  'NBA': 'NBA',
  'WNBA': 'WNBA',
  'NFL': 'NFL',
  'NHL': 'NHL',
  'WWE': 'WWE'
};

const espnLeaguePaths: Record<string, string> = {
  'MLB': 'baseball/mlb',
  'NBA': 'basketball/nba',
  'WNBA': 'basketball/wnba',
  'NFL': 'football/nfl',
  'NHL': 'hockey/nhl'
};

const TSDB_API_KEY = '3';

const teamLogoCache = new Map<string, Map<string, string>>();

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isRasterUrl(url: string): boolean {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(url);
}

async function fetchLogosFromESPN(league: string, logos: Map<string, string>): Promise<void> {
  const path = espnLeaguePaths[league];
  if (!path) return;
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/teams?limit=50`);
    const json = await res.json();
    const teams = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
    for (const entry of teams) {
      const logoEntries: any[] = entry?.team?.logos ?? [];
      // Prefer the first raster logo; skip SVGs entirely
      const logo = logoEntries.find((l: any) => isRasterUrl(l?.href ?? ''))?.href
        ?? logoEntries.find((l: any) => l?.href && !l.href.toLowerCase().endsWith('.svg'))?.href;
      const name: string = entry?.team?.displayName ?? '';
      if (logo && name) logos.set(normalizeTeamName(name), logo);
    }
  } catch {
    // Network/CORS failure — proceed without team crests
  }
}

async function getTeamLogos(league: string): Promise<Map<string, string>> {
  const cached = teamLogoCache.get(league);
  if (cached) return cached;

  const logos = new Map<string, string>();
  const tsdbLeague = tsdbLeagueNames[league];

  if (tsdbLeague) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${TSDB_API_KEY}/search_all_teams.php?l=${encodeURIComponent(tsdbLeague)}`
      );
      const json = await res.json();
      const teams: any[] = json?.teams ?? [];
      for (const team of teams) {
        const badge: string = team?.strTeamBadge ?? '';
        if (!badge || !isRasterUrl(badge)) continue;
        const name: string = team?.strTeam ?? '';
        if (name) logos.set(normalizeTeamName(name), badge);
        const short: string = team?.strTeamShort ?? '';
        if (short) logos.set(normalizeTeamName(short), badge);
      }
    } catch {
      // TheSportsDB unreachable — fall through to ESPN
    }
  }

  // Fall back to ESPN when TSDB returned nothing
  if (logos.size === 0) {
    await fetchLogosFromESPN(league, logos);
  }

  teamLogoCache.set(league, logos);
  return logos;
}

async function getTeamLogoUrl(league: string | undefined, teamName: string): Promise<string | undefined> {
  if (!league) return undefined;
  const logos = await getTeamLogos(league);
  return logos.get(normalizeTeamName(teamName));
}

function getSetting<T extends string | boolean | number>(key: string, fallback: T): Promise<T> {
  return Promise.race([
    presence.getSetting<T>(key).catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 500))
  ]);
}

function textContent(selector: string, root: ParentNode = document): string | null {
  const el = root.querySelector(selector);
  return el ? el.textContent?.trim() || null : null;
}

// ── Stream/match page ────────────────────────────────────────────────────────

// PreMiD activities run in an isolated JS world, so `window._SE` set by the
// page's own inline script is invisible to `window` here. The DOM is shared,
// though, so read the inline script's source text and parse it from there.
function readSEFromInlineScript(): any | null {
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent;
    if (!text || !text.includes('_SE')) continue;

    const match = text.match(/window\._SE\s*=\s*(\{[\s\S]*?\});/);
    if (!match) continue;

    try {
      return new Function(`return (${match[1]})`)();
    } catch {
      return null;
    }
  }
  return null;
}

function getSE(): any | null {
  const direct = (window as any)._SE;
  if (direct && direct.homeTeam) return direct;
  return readSEFromInlineScript();
}

function parseStreamPage(): MatchInfo | null {
  const se = getSE();
  if (!se || !se.homeTeam) return null;

  const homeTeam = normalizeString(se.homeTeam);
  if (!homeTeam) return null;

  const streamStatus = parseStreamStatusFromSE(se);
  const scheduled = typeof se.matchStartTime === 'number' ? se.matchStartTime : null;
  // League: _SE has no sport field — derive from URL path
  const league = getSupportedStreamLeague(se);

  // Single-entity events (boxing cards, races, etc.) have no away side and use a
  // different board layout: .se-board--event with .se-board__event-title/-status
  if (se.isVsMatch === false) {
    const eventStatusText = normalizeString(textContent('.se-board__event-status'));
    const normalizedEventStatus = eventStatusText
      ? (formatLeagueStatus(eventStatusText, league) || eventStatusText)
      : null;
    const finalEventStatus = normalizedEventStatus || streamStatus || (scheduled ? parseStartTime(scheduled) : null);

    return {
      homeTeam,
      awayTeam: '',
      status: finalEventStatus || undefined,
      league: league || undefined,
      url: location.href
    };
  }

  const awayTeam = normalizeString(se.awayTeam);
  if (!awayTeam) return null;

  // Status: check live board text first, then derive from _SE timing fields
  const statusText = normalizeString(
    textContent('.se-board__status-txt') ||
    textContent('.se-board__status span') ||
    textContent('.se-board__status')
  );

  // Normalize status text through the same formatter used for card statuses
  const normalizedStatus = statusText ? (formatLeagueStatus(statusText, league) || statusText) : null;
  const finalStatus = normalizedStatus || streamStatus || (scheduled ? parseStartTime(scheduled) : null);

  // Score: single combined element "2 - 10" in .se-board__score
  const combinedScore = normalizeString(textContent('.se-board__score'));
  let homeScore: string | undefined;
  let awayScore: string | undefined;
  if (combinedScore) {
    const parts = combinedScore.split(' - ');
    homeScore = normalizeString(parts[0]) || undefined;
    awayScore = normalizeString(parts[1]) || undefined;
  }

  return {
    homeTeam,
    awayTeam,
    status: finalStatus || undefined,
    homeScore,
    awayScore,
    league: league || undefined,
    url: location.href,
    // Show elapsed time in Discord for in-progress matches
    startTimestamp: (scheduled && !se.showEndedScreen && typeof se.timeUntilStart === 'number' && se.timeUntilStart <= 0)
      ? scheduled
      : undefined
  };
}

// ── Homepage match cards ──────────────────────────────────────────────────────

function parseMatchStatusFromCard(card: Element, league?: string | null): string | null {
  const candidateSelectors = [
    '.match-live-espn.status-live',
    '.m-card__pill-status',
    '.m-card__pill-end',
    '.m-card__pill-label',
    '.m-card__time-hour',
    '.m-card__time'
  ];

  for (const selector of candidateSelectors) {
    const status = normalizeString(textContent(selector, card));
    if (status) {
      const formatted = formatLeagueStatus(status, league);
      if (formatted) return formatted;
    }
  }

  const timeEl = card.querySelector('.m-card__time') as HTMLElement | null;
  const title = normalizeString(timeEl?.getAttribute('title'));
  if (title) {
    const formatted = formatLeagueStatus(title, league);
    return formatted || title;
  }

  const timeAttr = normalizeString(card.getAttribute('data-time') || timeEl?.getAttribute('data-time'));
  if (timeAttr && /^\d+$/.test(timeAttr)) {
    return parseStartTime(Number(timeAttr));
  }

  return null;
}

function getSectionLeague(card: Element): string | null {
  const section = card.closest('.m-section') as HTMLElement | null;
  return (
    parseSupportedLeague(section?.getAttribute('data-m-sport-name') || '') ||
    parseSupportedLeague(section?.querySelector('.m-section__title')?.textContent || '')
  );
}

function getCardLeague(card: Element): string | null {
  return (
    getSectionLeague(card) ||
    parseSupportedLeague(card.getAttribute('data-espn-path') || '') ||
    parseSupportedLeague((card.querySelector('.m-card__link') as HTMLAnchorElement | null)?.href || '')
  );
}

function parseLiveCard(card: Element): MatchInfo | null {
  // Full team names from data attribute "Detroit Tigers|Tampa Bay Rays"
  const teams = normalizeString(card.getAttribute('data-team-names') || '');
  const [homeTeamRaw, awayTeamRaw] = (teams ?? '').split('|').map((x) => x.trim());
  const homeTeam = normalizeString(homeTeamRaw);
  const awayTeam = normalizeString(awayTeamRaw);

  const home = homeTeam || normalizeString(textContent('.m-card__team--home .m-card__name', card));
  const away = awayTeam || normalizeString(textContent('.m-card__team--away .m-card__name', card));
  if (!home || !away) return null;

  const league = getCardLeague(card);

  // Scores: separate elements inside each team div
  const homeScore = normalizeString(textContent('.m-card__team--home .m-card__score', card)) || undefined;
  const awayScore = normalizeString(textContent('.m-card__team--away .m-card__score', card)) || undefined;

  return {
    homeTeam: home,
    awayTeam: away,
    status: parseMatchStatusFromCard(card, league) || undefined,
    homeScore,
    awayScore,
    league: league || undefined,
    url: (card.querySelector('.m-card__link') as HTMLAnchorElement | null)?.href || location.href
  };
}

// Single-entity cards (boxing bouts, races, etc.) are <a class="m-card ... m-card--event">
// with no data-match-id/data-team-names — title lives in .m-card__title and the link
// is the card element itself.
function parseEventCard(card: Element): MatchInfo | null {
  const title = normalizeString(textContent('.m-card__title', card));
  if (!title) return null;

  const league = getCardLeague(card);

  return {
    homeTeam: title,
    awayTeam: '',
    status: parseMatchStatusFromCard(card, league) || undefined,
    league: league || undefined,
    url: (card as HTMLAnchorElement).href || location.href
  };
}

function findLiveMatchOnHomePage(): MatchInfo | null {
  const cards = Array.from(document.querySelectorAll('.m-card[data-match-id], .m-card.m-card--event'));
  if (!cards.length) return null;

  const supportedCards = cards.filter((card) => !!getCardLeague(card));
  if (!supportedCards.length) return null;

  const live = supportedCards.find(
    (card) =>
      card.classList.contains('m-card--live') ||
      card.classList.contains('live') ||
      card.querySelector('.m-card__pill--live, .match-live-espn.status-live')
  );

  const upcoming = supportedCards.find((card) => {
    const ts = Number(card.getAttribute('data-time') || '0');
    return ts > 0 && ts * 1000 > Date.now();
  });

  const chosen = (live || upcoming || supportedCards[0]) as Element;
  return chosen.hasAttribute('data-match-id') ? parseLiveCard(chosen) : parseEventCard(chosen);
}

// ── Presence data ─────────────────────────────────────────────────────────────

async function buildPresenceData(match: MatchInfo, settings: Settings): Promise<PresenceData> {
  const title = match.awayTeam ? `${match.homeTeam} vs ${match.awayTeam}` : match.homeTeam;
  const sportKey = getSportAssetKey(match.league);
  const stateParts: string[] = [];

  if (match.league) stateParts.push(match.league);
  if (!settings.hideScores && match.homeScore && match.awayScore) {
    stateParts.push(`${match.homeScore} - ${match.awayScore}`);
  }
  if (match.status) stateParts.push(match.status);

  const data: PresenceData = {
    type: ActivityType.Watching,
    details: title,
    state: stateParts.join(' · '),
    largeImageKey: sportKey,
    largeImageText: title,
    smallImageKey: 'streameast',
    smallImageText: match.league || 'StreamEast',
    startTimestamp: match.startTimestamp,
    buttons: [{ label: 'Watch on StreamEast', url: match.url || location.href }]
  };

  // Team crest from TheSportsDB — shown as the small badge alongside the sport
  // icon. Falls back to the StreamEast badge if no logo is found.
  const logoUrl = await getTeamLogoUrl(match.league, match.homeTeam);
  if (logoUrl) {
    data.smallImageUrl = logoUrl;
    data.smallImageText = match.homeTeam;
  }

  return data;
}

// ── Update loop ───────────────────────────────────────────────────────────────

let lastKey: string | null = null;

async function update(): Promise<void> {
  const [privacyMode, hideScores] = await Promise.all([
    getSetting('privacyMode', false),
    getSetting('hideScores', false)
  ]);
  const settings: Settings = {
    privacyMode: privacyMode ?? false,
    hideScores: hideScores ?? false
  };

  let data: PresenceData;

  if (settings.privacyMode) {
    data = {
      type: ActivityType.Watching,
      details: 'Watching StreamEast',
      largeImageKey: 'streameast',
      largeImageText: 'StreamEast'
    };
  } else if (location.pathname === '/' || location.pathname === '') {
    // The homepage lists many cards across sports — showing one of them as
    // "the" match is misleading, so always present it as the generic homepage.
    data = {
      type: ActivityType.Watching,
      details: 'Browsing StreamEast',
      state: 'On the home page',
      largeImageKey: 'streameast',
      largeImageText: 'StreamEast'
    };
  } else {
    const match = parseStreamPage() || findLiveMatchOnHomePage();
    data = match
      ? await buildPresenceData(match, settings)
      : {
          type: ActivityType.Watching,
          details: 'Browsing StreamEast',
          largeImageKey: 'streameast',
          largeImageText: 'StreamEast'
        };
  }

  const key = JSON.stringify(data);
  if (key === lastKey) return;
  lastKey = key;

  presence.setActivity(data);
}

presence.on('UpdateData', () => {
  update().catch(() => {
    // Ensure we always show something even on unexpected error
    presence.setActivity({
      type: ActivityType.Watching,
      details: 'Browsing StreamEast',
      largeImageKey: 'streameast',
      largeImageText: 'StreamEast'
    });
  });
});

// Catch live score/status DOM changes without a URL change
if (document.body) {
  let debounce: number | null = null;
  new MutationObserver(() => {
    if (debounce !== null) return;
    debounce = window.setTimeout(() => {
      debounce = null;
      update().catch(() => {});
    }, 500);
  }).observe(document.body, { childList: true, subtree: true });
}
