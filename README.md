# PreMiD StreamEast Presence

A custom [PreMiD](https://premid.app/) presence that displays Discord Rich Presence while browsing [StreamEast](https://v2.streameast.ga). It reads live match details, scores, sport categories, and event status directly from the page — no API calls or third-party data sources involved.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/L5F821TQO2)

---

## About

This is purely a **coding project** — a browser extension presence built on the PreMiD platform. It does not stream, host, distribute, or provide access to any content. It only reads publicly visible text on a page you are already viewing and forwards that information to Discord's Rich Presence API.

---

## Features

- Shows current match or event in your Discord status
- Displays live score and match status when available
- Detects sport/league (NFL, NBA, MLB, NHL, UFC, Boxing, F1, CFB, Soccer, WNBA, WWE, NCAAB, and more)
- Shows team crests where available
- Supports single-entity events (boxing bouts, races, etc.)
- Privacy Mode and Hide Scores settings
- Handles TLD rotation — matches any `v2.streameast.<tld>` variant
- Updates on page navigation, tab focus, and DOM changes

---

## Project Structure

```
streameast-activity/    # Main PreMiD presence (with tests)
streameast-official/    # Alternate/reference presence variant
build-plugin.ps1        # PowerShell build and packaging script
validate-metadata.js    # Metadata schema validation helper
```

---

## Getting Started

### Prerequisites

- [PreMiD](https://premid.app/) installed and running
- [Node.js](https://nodejs.org/) (for development and testing)

### Development setup

```bash
cd streameast-activity
npm install
```

### Running tests

```bash
npm test
```

### Building

```powershell
.\build-plugin.ps1
```

---

## Contributing

Issues and pull requests are welcome. Please keep contributions focused on the presence logic, metadata, or test coverage.

---

## Support

If this project has been useful to you and you'd like to support continued development, you can buy me a coffee:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/L5F821TQO2)

---

## License

This project is not affiliated with, endorsed by, or connected to StreamEast, PreMiD, or Discord in any official capacity. It is an independent open-source development project.
