import {
  formatLeagueStatus,
  parseLeagueFromUrl,
  parseLeagueFromEspnPath,
  parseSupportedLeague,
  parseStreamStatusFromSE
} from '../utils';

describe('StreamEast utils', () => {
  test('parseSupportedLeague resolves supported categories', () => {
    expect(parseSupportedLeague('nba')).toBe('NBA');
    expect(parseSupportedLeague('Soccer')).toBe('Soccer');
    expect(parseSupportedLeague('collegefootball')).toBe('College Football');
    expect(parseSupportedLeague('wwe')).toBe('WWE');
  });

  test('parseLeagueFromEspnPath and parseLeagueFromUrl parse paths correctly', () => {
    expect(parseLeagueFromEspnPath('/espn/nba/some-game')).toBe('NBA');
    expect(parseLeagueFromUrl('https://v2.streameast.sk/soccer/game', 'https://v2.streameast.sk')).toBe('Soccer');
    expect(parseLeagueFromUrl('/mlb/free-stream', 'https://v2.streameast.sk')).toBe('MLB');
  });

  test('formatLeagueStatus normalizes common StreamEast statuses', () => {
    expect(formatLeagueStatus('Q1', 'NBA')).toBe('1st quarter');
    expect(formatLeagueStatus('q4', 'NBA')).toBe('4th quarter');
    expect(formatLeagueStatus('2H', 'Soccer')).toBe('2nd half');
    expect(formatLeagueStatus('ET', 'Soccer')).toBe('Extra time');
    expect(formatLeagueStatus('so', 'NHL')).toBe('Shootout');
    expect(formatLeagueStatus('Final', 'MLB')).toBe('Final');
    expect(formatLeagueStatus('HT', 'Soccer')).toBe('Half time');
  });

  test('formatLeagueStatus handles baseball inning ordinals from real DOM output', () => {
    // The live board and homepage cards emit "Top 4th", "Bot 7th" — with ordinal suffixes
    expect(formatLeagueStatus('Top 4th', 'MLB')).toBe('Top 4th inning');
    expect(formatLeagueStatus('Bot 7th', 'MLB')).toBe('Bot 7th inning');
    expect(formatLeagueStatus('Mid 2nd', 'MLB')).toBe('Mid 2nd inning');
    // Plain digit form should still work
    expect(formatLeagueStatus('Top 4', 'MLB')).toBe('Top 4 inning');
  });

  test('parseStreamStatusFromSE returns scheduled and ended states', () => {
    expect(parseStreamStatusFromSE({ showEndedScreen: true })).toBe('Final');
    expect(parseStreamStatusFromSE({ timeUntilStart: -1, showCountdown: true })).toBe('Starts soon');

    const futureTimestamp = Math.round(Date.now() / 1000 + 7200);
    const status = parseStreamStatusFromSE({ matchStartTime: futureTimestamp });
    expect(status).toMatch(/Starts /);
  });
});
