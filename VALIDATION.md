# Validation

Checked on 11 November 2026.

- `node --test model.test.mjs`: 3 passing tests, including category introductions, preserved historical values, plausible-range invariants, gaps, revision calculations and the latest RSI range change.
- Headless Chromium via Playwright 1.64.0: no JavaScript page errors; desktop at 1440px and mobile at 390px and 320px; no document overflow on either mobile width.
- Browser interactions checked: 13 default plotted series, group filtering, arrival-year/revision modes, focused ranges, keyboard date selection, untracked categories, restoring a shared URL, and CSV export with all 227 observations.
- Full-page [desktop](docs/screenshots/desktop.png) and [mobile](docs/screenshots/mobile.png) screenshots were captured and visually inspected.
- `git diff --check`: passed.

The early image-table values were manually transcribed and visually checked against the original images. Later values were extracted from the current-estimate columns of each embedded Datawrapper dataset. Historical inconsistencies are documented in the page and README.

Not checked: Safari, Firefox, screen-reader output, or the factual accuracy of the publication's underlying news and forecasts. Future archive updates are manual.
