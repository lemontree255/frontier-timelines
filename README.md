# Frontier Timeline Observatory

A small interactive view of how [Frontier Timelines](https://frontiertimelines.substack.com/) has revised its technology forecasts.

**[Open the interactive graph](https://lemontree255.github.io/frontier-timelines/)**

[Desktop screenshot](docs/screenshots/desktop.png) · [Mobile screenshot](docs/screenshots/mobile.png)

21 dated forecast sessions, 20 June–10 November 2026. The archive contains 227 observations, including qualitative weak-RSI status. Retrieved 11 November 2026.

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
- Qualitative weak-RSI “Now” and “Achieved” entries have no fabricated calendar year and are not drawn as numeric forecasts.
- “Years moved” compares with each category's own first directly recorded central estimate. This can differ from the publication's retrospective “change vs. first week” column.
- Step lines show a new forecast taking effect on a recorded session date. Undefined observations break the line. They do not assert a forecast between unobserved sessions.
- Ranges are the publication's qualitative plausible ranges, **not statistical confidence intervals**. There is no inferred probability distribution.

These are one publication's AI-generated scenario estimates, not independent expert consensus, factual achievement dates or a fact-check of the underlying news. Definitions and model choices evolve. Publication attribution remains with Frontier Timelines. This project is independent and unaffiliated.

Updates are manual: append a source-linked report to the JSON dataset, preserve the original current-estimate values and category introductions, and run the checks. No scraping service, account, analytics or scheduled job is required.

## Dependencies and licence

The only JavaScript library is vendored [D3 7.9.0](https://github.com/d3/d3/tree/v7.9.0), under its ISC licence; see [vendor/D3-LICENSE](vendor/D3-LICENSE). Google Fonts supplies optional typography; system and Georgia fallbacks work without it. All chart code and data are served from this repository.

Original project code is MIT-licensed. The licence does not relicense the publication's content, trademarks or third-party libraries. Forecast values are attributed to their source in the dataset.
