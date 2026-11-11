export function firstEstimate(reports, id) {
  return reports.find(report => report.estimates[id]?.central != null);
}

export function plottedValue(point, mode, baseline, field = 'central') {
  if (point?.[field] == null || baseline == null) return null;
  return point[field] - (mode === 'change' ? baseline : 0);
}

export function shiftText(change) {
  if (change === 0) return 'Unchanged';
  return `${Math.abs(change)} ${Math.abs(change) === 1 ? 'year' : 'years'} ${change < 0 ? 'earlier' : 'later'}`;
}
