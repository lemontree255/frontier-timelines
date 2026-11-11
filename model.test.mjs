import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { firstEstimate, plottedValue, shiftText } from './model.mjs';

const data = JSON.parse(await readFile(new URL('./data/forecasts.json', import.meta.url)));

test('dated observations preserve category introductions and source provenance', () => {
  assert.equal(data.reports.length, 21);
  assert.equal(data.reports[0].date, '2026-06-20');
  assert.equal(data.reports.at(-1).date, '2026-11-10');
  const ids = new Set(data.categories.map(category => category.id));
  let previous = '';
  for (const report of data.reports) {
    assert.ok(report.date > previous);
    assert.match(report.url, /^https:\/\/frontiertimelines\.substack\.com\/p\//);
    previous = report.date;
    for (const [id, estimate] of Object.entries(report.estimates)) {
      assert.ok(ids.has(id));
      if (estimate.central != null) {
        assert.ok(Number.isInteger(estimate.central));
        assert.ok(estimate.low <= estimate.central && estimate.central <= estimate.high);
      } else assert.equal(id, 'weak');
    }
  }
  assert.equal(firstEstimate(data.reports, 'rsi').date, '2026-07-14');
  assert.equal(firstEstimate(data.reports, 'hybrid').date, '2026-09-29');
  assert.equal(firstEstimate(data.reports, 'fusion').date, '2026-09-01');
  assert.equal(firstEstimate(data.reports, 'superconductors').date, '2026-10-27');
  assert.equal(data.reports[0].estimates['legacy-rsi'].central, 2031);
  assert.equal(data.reports[0].estimates.rsi, undefined);
  assert.equal(data.reports[0].estimates.policy, undefined);
});

test('revision mode uses each category’s own start, preserves gaps and shifts both range bounds', () => {
  const first = firstEstimate(data.reports, 'lev').estimates.lev.central;
  const last = data.reports.at(-1).estimates.lev;
  assert.equal(plottedValue(last, 'year', first), 2031);
  assert.equal(plottedValue(last, 'change', first), -14);
  assert.equal(plottedValue(last, 'change', first, 'low'), -17);
  assert.equal(plottedValue(last, 'change', first, 'high'), -4);
  assert.equal(plottedValue(undefined, 'change', first), null);
  const hybrid = firstEstimate(data.reports, 'hybrid').estimates.hybrid;
  assert.equal(plottedValue(hybrid, 'change', hybrid.central), 0);
  assert.equal(plottedValue({status:'Achieved'}, 'year', 2026), null);
  assert.equal(shiftText(-1), '1 year earlier');
  assert.equal(shiftText(2), '2 years later');
  assert.equal(shiftText(0), 'Unchanged');
});

test('latest range revision does not accidentally move the central forecast', () => {
  const [previous, current] = data.reports.slice(-2).map(report => report.estimates.rsi);
  assert.equal(current.central, previous.central);
  assert.equal(previous.high, 2030);
  assert.equal(current.high, 2029);
  assert.equal(data.reports.at(-1).estimates.weak.status, 'Achieved');
});
