# Validation

## Refresh and automation — 18 November 2026

- Added the 17 November source forecast: 22 sessions and 241 observations. All previous 21 reports were compared with the committed dataset and preserved exactly.
- `python3 -m unittest discover -s tests`: 3 passing importer checks covering moved current-estimate columns, qualitative statuses, unknown/incomplete/invalid source data, unchanged history and idempotence.
- `node --test model.test.mjs`: 4 passing checks, including the transition from a numeric forecast to the source's “Achieved” classification.
- Re-running the importer against the live source added zero updates.
- Executed the workflow's actual lightweight probe with unchanged and new-forecast responses: exactly two HTTP requests in each case, with the correct skip/update decision. Unchanged scheduled runs skip checkout, parsing, tests, commits and Pages publication.
- Headless Chromium: latest session, achieved inspector/table state, previous numeric history, both axes, range checkbox, CSV export, no page errors, and no document overflow at 390px or 320px. Updated desktop/mobile screenshots were visually inspected.
- Workflow runs only for this public repository, on a standard `ubuntu-latest` runner, with a five-minute limit and no artifact/cache upload steps. No AI services or custom credentials are used.

## Initial release — 11 November 2026

Checked on 11 November 2026.

- `node --test model.test.mjs`: 3 passing tests, including category introductions, preserved historical values, plausible-range invariants, gaps, revision calculations and the latest RSI range change.
- Headless Chromium via Playwright 1.64.0: no JavaScript page errors; desktop at 1440px and mobile at 390px and 320px; no document overflow on either mobile width.
- Browser interactions checked: 13 default plotted series, group filtering, arrival-year/revision modes, focused ranges, keyboard date selection, untracked categories, restoring a shared URL, and CSV export with all 227 observations.
- Full-page [desktop](docs/screenshots/desktop.png) and [mobile](docs/screenshots/mobile.png) screenshots were captured and visually inspected.
- `git diff --check`: passed.

The early image-table values were manually transcribed and visually checked against the original images. Later values were extracted from the current-estimate columns of each embedded Datawrapper dataset. Historical inconsistencies are documented in the page and README.

Not checked: Safari, Firefox, screen-reader output, or the factual accuracy of the publication's underlying news and forecasts. New-format source posts and corrections to existing posts require manual review.
