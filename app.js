import { firstEstimate, plottedValue, shiftText } from './model.mjs';

const $ = id => document.getElementById(id);
const colours = ['#176f64','#b17624','#5572ad','#b45443','#8867a0','#2c8795','#b36a86','#63843b','#8c715a','#5961a2','#9a7835','#548b79','#606d79','#7d7d72'];
const formatDate = date => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const utcDate = date => new Date(`${date}T00:00:00Z`);

async function start() {
  const response = await fetch('./data/forecasts.json');
  if (!response.ok) throw new Error(`Forecast archive returned HTTP ${response.status}`);
  const data = await response.json();
  const { reports, categories } = data;
  const numeric = categories.filter(category => category.id !== 'weak');
  const defaults = numeric.filter(category => category.id !== 'legacy-rsi').map(category => category.id);
  const first = new Map(numeric.map(category => [category.id, firstEstimate(reports, category.id)]));
  const colour = new Map(numeric.map((category, index) => [category.id, colours[index]]));
  const params = new URLSearchParams(location.hash.slice(1));
  const state = {
    index: reports.findIndex(report => report.date === params.get('date')),
    focus: numeric.some(category => category.id === params.get('focus')) ? params.get('focus') : 'agi',
    mode: params.get('view') === 'change' ? 'change' : 'year',
    visible: new Set(defaults),
    range: false,
  };
  if (state.index < 0) state.index = reports.length - 1;
  state.visible.add(state.focus);
  let x, y, bounds, chartWidth;
  const svg = d3.select('#chart');
  const series = numeric.map(category => ({
    ...category,
    points: reports.map(report => ({ date: utcDate(report.date), estimate: report.estimates[category.id] })),
    baseline: first.get(category.id).estimates[category.id].central,
  }));

  $('report-count').textContent = reports.length;
  $('coverage').textContent = `${formatDate(reports[0].date)} — ${formatDate(reports.at(-1).date)} 2026`;
  $('retrieved').textContent = `${formatDate(data.retrieved)} 2026`;
  $('date-slider').max = reports.length - 1;
  $('first-date').textContent = formatDate(reports[0].date);
  $('last-date').textContent = formatDate(reports.at(-1).date);
  for (const category of numeric) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.label;
    $('focus').append(option);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = category.id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = colour.get(category.id);
    if (numeric.indexOf(category) > 6) swatch.style.background = `repeating-linear-gradient(90deg, ${colour.get(category.id)} 0 5px, transparent 5px 8px)`;
    button.append(swatch, document.createTextNode(category.label));
    button.addEventListener('click', () => {
      if (state.visible.has(category.id)) state.visible.delete(category.id);
      else state.visible.add(category.id);
      updateControls();
      draw();
    });
    $('legend').append(button);
  }

  function saveLocation() {
    const hash = new URLSearchParams({ date: reports[state.index].date, focus: state.focus, view: state.mode });
    history.replaceState(null, '', `#${hash}`);
  }

  function selectIndex(index) {
    state.index = Math.max(0, Math.min(reports.length - 1, index));
    $('tooltip').hidden = true;
    updateSnapshot();
    draw();
    saveLocation();
    $('selection-status').textContent = `Selected ${formatDate(reports[state.index].date)} 2026`;
  }

  function focusTimeline(id) {
    state.focus = id;
    state.visible.add(id);
    updateControls();
    updateSnapshot();
    draw();
    saveLocation();
  }

  function updateControls() {
    $('focus').value = state.focus;
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', button.dataset.mode === state.mode));
    document.querySelectorAll('[data-group]').forEach(button => {
      const expected = button.dataset.group === 'all' ? defaults : numeric.filter(category => category.group === button.dataset.group && category.id !== 'legacy-rsi').map(category => category.id);
      button.setAttribute('aria-pressed', expected.length === state.visible.size && expected.every(id => state.visible.has(id)));
    });
    $('legend').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', state.visible.has(button.dataset.id)));
    $('axis-help').textContent = state.mode === 'year' ? 'Lower lines mean earlier predicted arrival.' : 'Below zero = pulled earlier, relative to each timeline’s first recorded estimate.';
  }

  function updateInspector(index) {
    const category = categories.find(category => category.id === state.focus);
    const report = reports[index];
    const point = report.estimates[state.focus];
    const initial = first.get(state.focus);
    $('focus-value').textContent = point?.central ?? '—';
    $('focus-range').textContent = point ? `${point.low}–${point.high} · ${formatDate(report.date)}` : `Not tracked on ${formatDate(report.date)}`;
    $('focus-change').textContent = point ? `${shiftText(point.central - initial.estimates[state.focus].central)} since first recorded` : `First recorded ${formatDate(initial.date)}`;
    $('focus-definition').textContent = category.definition;
    $('focus-first').textContent = `First: ${initial.estimates[state.focus].central} · ${formatDate(initial.date)} 2026`;
    $('focus-source').href = report.url;
    $('focus-source').textContent = `${formatDate(report.date)} update ↗`;
  }

  function updateSnapshot() {
    const report = reports[state.index];
    $('selected-date').textContent = `${formatDate(report.date)} 2026`;
    $('date-slider').value = state.index;
    $('date-slider').setAttribute('aria-valuetext', `${formatDate(report.date)} 2026`);
    $('previous').disabled = state.index === 0;
    $('next').disabled = state.index === reports.length - 1;
    $('model').textContent = report.model;
    $('report-link').href = report.url;
    $('report-notes').textContent = report.notes.join(' ');
    $('report-notes').hidden = !report.notes.length;
    $('table-source').href = report.tableUrl || report.imageUrl || report.url;
    const status = report.estimates.weak?.status;
    $('status-line').textContent = status ? `Weak RSI: ${status} · qualitative status, not a dated forecast` : 'Only directly recorded estimates are shown. No backfilling.';
    $('snapshot-rows').replaceChildren();
    for (const category of numeric) {
      const point = report.estimates[category.id];
      const initial = first.get(category.id);
      const row = document.createElement('tr');
      const name = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'timeline-button';
      button.setAttribute('aria-pressed', state.focus === category.id);
      const dot = document.createElement('span');
      dot.className = 'swatch';
      dot.style.background = colour.get(category.id);
      button.append(dot, document.createTextNode(category.label));
      button.addEventListener('click', () => focusTimeline(category.id));
      name.append(button);
      row.append(name);
      const change = point ? point.central - initial.estimates[category.id].central : null;
      const cells = [
        `${initial.estimates[category.id].central} · ${formatDate(initial.date)}`,
        point?.central ?? 'Not tracked',
        point ? `${point.low}–${point.high}` : '—',
        change == null ? '—' : shiftText(change),
      ];
      cells.forEach((text, index) => {
        const cell = document.createElement('td');
        cell.textContent = text;
        if (!point) cell.className = 'untracked';
        else if (index === 1) cell.className = 'current-cell';
        else if (index === 3 && change) cell.className = change < 0 ? 'shift-earlier' : 'shift-later';
        if (index === 3 && change < 0) {
          const track = document.createElement('span');
          track.className = 'shift-track';
          track.setAttribute('aria-hidden', 'true');
          const bar = document.createElement('span');
          bar.style.width = `${Math.min(100, Math.abs(change) / 14 * 100)}%`;
          track.append(bar);
          cell.prepend(track);
        }
        row.append(cell);
      });
      $('snapshot-rows').append(row);
    }
    updateInspector(state.index);
  }

  function draw() {
    chartWidth = $('chart').getBoundingClientRect().width;
    const height = chartWidth < 480 ? 350 : 420;
    const margin = { top: 26, right: 12, bottom: 54, left: 53 };
    bounds = { left: margin.left, right: chartWidth - margin.right, top: margin.top, bottom: height - margin.bottom };
    svg.attr('viewBox', `0 0 ${chartWidth} ${height}`).style('height', `${height}px`);
    svg.selectAll(':not(title):not(desc)').remove();
    x = d3.scaleUtc().domain(d3.extent(reports, report => utcDate(report.date))).range([bounds.left + 4, bounds.right - 4]);
    const visible = series.filter(item => state.visible.has(item.id));
    const values = visible.flatMap(item => item.points.flatMap(point => {
      const fields = state.range && item.id === state.focus ? ['low', 'central', 'high'] : ['central'];
      return fields.map(field => plottedValue(point.estimate, state.mode, item.baseline, field)).filter(value => value != null);
    }));
    if (state.mode === 'change') values.push(0);
    let [min, max] = d3.extent(values.length ? values : [0, 1]);
    const padding = Math.max(0.6, (max - min) * .06);
    y = d3.scaleLinear().domain([min - padding, max + padding]).nice().range([bounds.bottom, bounds.top]);
    const yTicks = y.ticks(6).filter(Number.isInteger);
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${bounds.left},0)`).call(d3.axisLeft(y).tickValues(yTicks).tickSize(-(bounds.right - bounds.left)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${bounds.left},0)`).call(d3.axisLeft(y).tickValues(yTicks).tickSize(0).tickPadding(12).tickFormat(value => state.mode === 'change' ? `${value > 0 ? '+' : ''}${value}` : String(value)));
    const tickDates = chartWidth < 420 ? [reports[0].date, reports[7].date, reports[14].date, reports.at(-1).date] : [reports[0].date, ...reports.filter(report => ['2026-07-14','2026-08-04','2026-08-25','2026-09-15','2026-10-13','2026-11-10'].includes(report.date)).map(report => report.date)];
    const axis = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${bounds.bottom})`).call(d3.axisBottom(x).tickValues(tickDates.map(utcDate)).tickSize(0).tickPadding(12).tickFormat(d3.utcFormat('%-d %b')));
    axis.select('.tick:first-of-type text').attr('text-anchor', 'start');
    axis.select('.tick:last-of-type text').attr('text-anchor', 'end');
    svg.append('text').attr('class', 'axis-label').attr('x', bounds.left).attr('y', 12).text(state.mode === 'year' ? 'Predicted arrival year' : 'Years moved from first estimate');
    svg.append('text').attr('class', 'axis-label').attr('x', (bounds.left + bounds.right) / 2).attr('y', height - 8).attr('text-anchor', 'middle').text('Date of forecast · 2026');
    svg.append('defs').append('clipPath').attr('id', 'plot-clip').append('rect').attr('x', bounds.left).attr('y', bounds.top).attr('width', bounds.right - bounds.left).attr('height', bounds.bottom - bounds.top);
    const plot = svg.append('g').attr('clip-path', 'url(#plot-clip)');
    if (state.mode === 'change') plot.append('line').attr('class', 'zero-line').attr('x1', bounds.left).attr('x2', bounds.right).attr('y1', y(0)).attr('y2', y(0));
    const focused = visible.find(item => item.id === state.focus);
    if (state.range && focused) {
      const area = d3.area().defined(point => point.estimate?.central != null).x(point => x(point.date)).y0(point => y(plottedValue(point.estimate, state.mode, focused.baseline, 'low'))).y1(point => y(plottedValue(point.estimate, state.mode, focused.baseline, 'high'))).curve(d3.curveStepAfter);
      plot.append('path').datum(focused.points).attr('d', area).attr('fill', colour.get(focused.id)).attr('opacity', .12);
    }
    for (const item of [...visible.filter(item => item.id !== state.focus), ...visible.filter(item => item.id === state.focus)]) {
      const line = d3.line().defined(point => point.estimate?.central != null).x(point => x(point.date)).y(point => y(plottedValue(point.estimate, state.mode, item.baseline))).curve(d3.curveStepAfter);
      plot.append('path').datum(item.points).attr('d', line).attr('class', `series-path ${item.id === state.focus ? 'focused' : ''}`).attr('stroke', colour.get(item.id)).attr('stroke-dasharray', numeric.findIndex(category => category.id === item.id) > 6 ? '6 4' : null).attr('opacity', item.id === state.focus ? 1 : .65);
      plot.selectAll(`.point-${item.id}`).data(item.points.filter((point, index) => point.estimate?.central != null && (item.id === state.focus || index === 0 || item.points[index - 1].estimate?.central !== point.estimate.central))).join('circle').attr('cx', point => x(point.date)).attr('cy', point => y(plottedValue(point.estimate, state.mode, item.baseline))).attr('r', item.id === state.focus ? 3.1 : 2.2).attr('fill', colour.get(item.id));
    }
    if (!visible.length) svg.append('text').attr('class', 'empty-label').attr('x', (bounds.left + bounds.right) / 2).attr('y', height / 2).attr('text-anchor', 'middle').text('Select a timeline below to show its forecast.');
    const guide = plot.append('line').attr('class', 'guide').attr('y1', bounds.top).attr('y2', bounds.bottom).style('display', 'none');
    const markers = plot.append('g');
    plot.append('line').attr('class', 'selected-guide').attr('x1', x(utcDate(reports[state.index].date))).attr('x2', x(utcDate(reports[state.index].date))).attr('y1', bounds.top).attr('y2', bounds.bottom);
    svg.append('rect').attr('class', 'chart-hit').attr('x', bounds.left).attr('y', bounds.top).attr('width', bounds.right - bounds.left).attr('height', bounds.bottom - bounds.top)
      .on('pointermove', event => {
        const [px] = d3.pointer(event, $('chart'));
        const index = d3.bisector(report => utcDate(report.date)).center(reports, x.invert(px));
        const dateX = x(utcDate(reports[index].date));
        guide.style('display', null).attr('x1', dateX).attr('x2', dateX);
        markers.selectAll('circle').data(visible.filter(item => item.points[index].estimate?.central != null)).join('circle').attr('cx', dateX).attr('cy', item => y(plottedValue(item.points[index].estimate, state.mode, item.baseline))).attr('r', 4).attr('fill', item => colour.get(item.id)).attr('stroke', 'var(--surface)').attr('stroke-width', 1.5);
        const point = reports[index].estimates[state.focus];
        $('tooltip').textContent = `${formatDate(reports[index].date)}${point ? ` · ${categories.find(category => category.id === state.focus).label}: ${point.central}` : ''}`;
        $('tooltip').hidden = false;
        const tooltipWidth = $('tooltip').offsetWidth;
        $('tooltip').style.left = `${Math.max(0, Math.min(chartWidth - tooltipWidth, dateX - tooltipWidth / 2))}px`;
        $('tooltip').style.top = '10px';
        updateInspector(index);
      })
      .on('pointerleave', () => {
        $('tooltip').hidden = true;
        guide.style('display', 'none');
        markers.selectAll('*').remove();
        updateInspector(state.index);
      })
      .on('click', event => {
        const [px] = d3.pointer(event, $('chart'));
        selectIndex(d3.bisector(report => utcDate(report.date)).center(reports, x.invert(px)));
      });
  }

  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    updateControls();
    draw();
    saveLocation();
  }));
  document.querySelectorAll('[data-group]').forEach(button => button.addEventListener('click', () => {
    state.visible = new Set(button.dataset.group === 'all' ? defaults : numeric.filter(category => category.group === button.dataset.group && category.id !== 'legacy-rsi').map(category => category.id));
    if (!state.visible.has(state.focus)) state.focus = [...state.visible][0];
    updateControls();
    updateSnapshot();
    draw();
    saveLocation();
  }));
  $('focus').addEventListener('change', event => focusTimeline(event.target.value));
  $('show-range').addEventListener('change', event => { state.range = event.target.checked; draw(); });
  $('date-slider').addEventListener('input', event => selectIndex(Number(event.target.value)));
  $('previous').addEventListener('click', () => selectIndex(state.index - 1));
  $('next').addEventListener('click', () => selectIndex(state.index + 1));
  $('download').addEventListener('click', () => {
    const rows = [['forecast_date','published_at','category','central_year','low_year','high_year','status','source_value','model','source_url','table_url','image_url']];
    for (const report of reports) for (const category of categories) {
      const point = report.estimates[category.id];
      if (point) rows.push([report.date,report.published,category.name,point.central,point.low,point.high,point.status,point.raw,report.model,report.url,report.tableUrl,report.imageUrl]);
    }
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `frontier-timelines-${data.retrieved}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('loading').hidden = true;
  $('app').hidden = false;
  updateControls();
  updateSnapshot();
  new ResizeObserver(draw).observe($('chart').parentElement);
}

start().catch(error => {
  $('loading').hidden = true;
  $('error').hidden = false;
  $('error').textContent = `The forecast archive could not load. Please refresh or view the dataset linked below. ${error.message}`;
});
