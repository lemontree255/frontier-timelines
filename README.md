# Frontier Timeline Observatory

A small interactive view of how [Frontier Timelines](https://frontiertimelines.substack.com/) has revised its technology forecasts.

**[Open the interactive graph](https://lemontree255.github.io/frontier-timelines/)**

[Desktop screenshot](docs/screenshots/desktop.png) · [Mobile screenshot](docs/screenshots/mobile.png)

Source-linked weekly forecast sessions starting on 20 June 2026. The graph reads its coverage, update count and retrieval date directly from the dataset.

- Compare arrival years or movement since each category's first recorded forecast.
- Focus a timeline and display its published plausible range.
- Filter by intelligence, life and society, or physical technologies; toggle individual series.
- Explore dated updates with the chart or keyboard-accessible slider, inspect exact values, and follow source links.
- Export all observations to CSV. The date, focused category and axis mode are shareable in the URL fragment.

## Run locally

No build step, package installation or backend.

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Use an HTTP server rather than opening the page as a local file: it loads its dataset with `fetch`.

```sh
node --test model.test.mjs
python3 -m unittest discover -s tests
```

GitHub Pages serves the repository root from `main`.

## Data and interpretation

[data/forecasts.json](data/forecasts.json) contains the underlying observations. Each report stores its forecast date, actual publication timestamp, model label, original post URL, source image or downloadable Datawrapper table URL, notes, original source values, central estimates and range bounds. Early image tables were manually transcribed; later current-estimate columns were extracted from the public embedded table datasets. Original articles and images are linked, not republished.

The graph uses the **forecast date stated inside the post**, not the timestamp of publication. The first three reports were published on 8 July but describe 20 June, 30 June and 7 July sessions.

Use each post's **current** estimate rather than retrospective baseline columns. In particular:

- Original RSI was 2031 (2028–2038) on 20 June. Keep it separate from the later three-part RSI framework. Autonomous/full RSI is first separately forecast on 14 July at 2032 (2029–2038). Later tables retrospectively use 2032 as their first full-RSI baseline; the chart does not backdate that baseline.
- The 14 July retrospective GPT-5.5 comparison differs from the 7 July current table. Preserve the original 7 July values, including AGI 2028 (2027–2033) and ASI 2032 (2028–2042).
- The original FDVR series continues as Neural FDVR, as explicitly stated on 29 September. Hybrid FDVR begins on that date as a distinct category.
- Do not backfill categories that were introduced later. UBI starts on 14 July, general and asteroid-enabled post-scarcity on 18 August, fusion on 1 September, and superconductors on 27 October.
- Qualitative “Now” and “Achieved” entries have no fabricated calendar year and are not drawn as numeric forecasts. On 17 November, strong AI R&D automation becomes “Achieved” in the source: its numeric line stops, while the inspector, table and CSV retain the status. This is the publication's classification, not our independent verification.
- “Years moved” compares with each category's own first directly recorded central estimate. This can differ from the publication's retrospective “change vs. first week” column.
- Step lines show a new forecast taking effect on a recorded session date. Undefined observations break the line. They do not assert a forecast between unobserved sessions.
- Ranges are the publication's qualitative plausible ranges, **not statistical confidence intervals**. There is no inferred probability distribution.

These are one publication's AI-generated scenario estimates, not independent expert consensus, factual achievement dates or a fact-check of the underlying news. Definitions and model choices evolve. Publication attribution remains with Frontier Timelines. This project is independent and unaffiliated.

## Automatic refresh

[Refresh forecasts](https://github.com/lemontree255/frontier-timelines/actions/workflows/refresh.yml) checks daily at **07:15 Europe/Copenhagen**, including daylight-saving changes. GitHub may delay scheduled runs. You can also choose **Run workflow** there for an immediate refresh and validation.

The scheduled no-change path makes just two public HTTP requests: the committed dataset and the latest Substack archive page. If there is no unseen forecast it stops **before checkout**, parsing, tests or publishing. There are no artifacts, caches, AI/API subscriptions or custom secrets. The workflow uses a standard `ubuntu-latest` runner, which is [free for public repositories](https://docs.github.com/en/billing/concepts/product-billing/github-actions); the job is disabled if the repository becomes private. The job has a five-minute limit.

When new posts appear, `scripts/refresh.py` follows the archive back to a known report, fetches each new post's first public Datawrapper table, and locates the **current** estimate column by its heading (the column order changes on 17 November). It validates dates, known categories, statuses, bounds and completeness before atomically appending anything. Existing history is never rewritten. Unknown categories, image-only updates and unexpected formats fail the run for manual review rather than publishing guesses.

Checks run before a bot commit. Only the data file is staged. The workflow explicitly requests a GitHub Pages build because commits made using `GITHUB_TOKEN` do not trigger that build themselves. A no-change scheduled run makes no commit and no deployment. Manual runs republish the current site even without new data, so they can retry a failed build.

To refresh locally:

```sh
python3 scripts/refresh.py
```

Changes to previously published posts require manual review; this importer only appends new reports. GitHub can disable public scheduled workflows after 60 days without repository activity; re-enable it in Actions if the publication stops updating for that long. Follow failure notifications in GitHub; no additional notification service is installed.

## Dependencies and licence

The only JavaScript library is vendored [D3 7.9.0](https://github.com/d3/d3/tree/v7.9.0), under its ISC licence; see [vendor/D3-LICENSE](vendor/D3-LICENSE). Google Fonts supplies optional typography; system and Georgia fallbacks work without it. All chart code and data are served from this repository.

Original project code is MIT-licensed. The licence does not relicense the publication's content, trademarks or third-party libraries. Forecast values are attributed to their source in the dataset.
