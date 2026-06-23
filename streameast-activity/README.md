# StreamEast PreMiD Activity

A PreMiD activity for StreamEast that reads live match details and scores from the StreamEast front page or match stream page.

## What it does
- Detects StreamEast match pages and live feed cards
- Extracts team names from `data-team-names`
- Reads live score spans from `.m-card__score`
- Pulls team crest URLs from StreamEast cards and stream boards when available
- Uses `window._SE` metadata on the stream page when available
- Shows match details in Discord activity presence

## Installation
1. Copy this folder into your PreMiD Activities workspace.
2. Replace `YOUR_CLIENT_ID` in `presence.ts` with a valid Discord client ID.
3. Use PreMiD dev mode or the PreMiD activity CLI to run it.

### Running tests
- Install dev dependencies in this folder: `npm install`
- Run the utility test suite: `npm test`

## Notes
- This activity prefers stream page metadata first.
- If no stream page data exists, it falls back to the home page match card feed.
- Pulls crest image URLs from `.se-board__crest-img` and `.m-card__crest img` when available.
- Falls back to a bundled `assets/streameast.svg` image when StreamEast logo URLs are unavailable.
- Where supported by PreMiD/Discord, these crest URLs are exposed as presence image data.
- Score and match status parsing is based on StreamEast card and stream page structure.
- Detects league names from section headers, `data-m-sport-name`, `data-espn-path`, or match URL paths.
- Restricts league detection to StreamEast's supported categories: NFL, NBA, MLB, NHL, UFC, Boxing, F1, CFB, Soccer, WNBA, WWE, NCAAB, and Other events.
- Uses stream page `window._SE` metadata for league and status when available, including `showCountdown`, `timeUntilStart`, `matchStartTime`, and `showEndedScreen`.
- Refreshes activity when StreamEast navigation occurs, history state changes, tab focus returns, visibility changes, or DOM content updates.
- Formats sport-specific statuses, including innings, quarters, periods, halves, overtime, scheduled starts, and common StreamEast scoreboard labels.

## Supported pages
- `v2.streameast.<tld>` (StreamEast periodically rotates its TLD, e.g. `.sk` -> `.ga`; the activity's regExp matches any 2-4 letter TLD)
- StreamEast live match pages with `window._SE`, including single-entity event pages (`isVsMatch: false`, e.g. boxing bouts, races) via `.se-board__event-title`/`.se-board__event-status`
- Homepage live match list with `.m-card[data-match-id]`
- Homepage single-entity event cards with `.m-card.m-card--event` (e.g. Boxing/Other Events sections)
- StreamEast sports category pages for the supported sport list above

## Future improvements
- add team-specific image assets to metadata
- include more venue or broadcast source details
- improve per-league status formatting and support additional non-sports streams
