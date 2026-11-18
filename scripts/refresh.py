"""Append newly published, source-linked forecasts. Uses Python's standard library and curl."""

import csv
import io
import json
import re
import subprocess
from datetime import date, datetime
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/forecasts.json'
SOURCE = 'https://frontiertimelines.substack.com'
ALIASES = {
    'AGI': 'agi', 'ASI': 'asi', 'Early RSI': 'weak',
    'Human Assisted Weak RSI': 'weak',
    'Strong AI R&D automation': 'research',
    'Human Assisted Strong AI R&D automation': 'research',
    'Full RSI': 'rsi', 'Fully Autonomous RSI': 'rsi',
    'Multipurpose home robots': 'robots', 'LEV': 'lev',
    'FDVR': 'neural', 'Neural FDVR': 'neural',
    'Neural FDVR — formerly FDVR': 'neural', 'Hybrid FDVR': 'hybrid',
    'UBI / Post-Labor Policy': 'policy', 'Fusion': 'fusion',
    'Standard Condition Superconductors': 'superconductors',
    'General Post-Scarcity': 'abundance',
    'True Post-Scarcity w/ Asteroid Mining': 'asteroids',
}


def fetch(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in (
        'frontiertimelines.substack.com', 'datawrapper.dwcdn.net'
    ):
        raise ValueError(f'Unexpected source URL: {url}')
    return subprocess.check_output([
        'curl', '--fail', '--silent', '--show-error', '--location',
        '--max-time', '45', '--retry', '2', url,
    ], text=True)


class PostHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.text = []
        self.tables = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        if tag == 'iframe':
            url = dict(attrs).get('src', '')
            if re.fullmatch(r'https://datawrapper\.dwcdn\.net/[A-Za-z0-9]+/\d+/', url):
                self.tables.append(url + 'dataset.csv')

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1

    def handle_data(self, value):
        if not self.skip:
            self.text.append(value)


def parse_estimate(raw):
    raw = raw.strip().replace('**', '')
    match = re.fullmatch(r'(\d{4})\s*\((\d{4})\s*[–—-]\s*(\d{4})\)', raw)
    if match:
        central, low, high = map(int, match.groups())
        if not (2000 <= low <= central <= high <= 2200):
            raise ValueError(f'Invalid estimate bounds: {raw}')
        return dict(central=central, low=low, high=high, raw=raw)
    if raw in ('Now', 'Achieved', 'Achieved Before First Publication'):
        return dict(status=raw, raw=raw)
    raise ValueError(f'Unrecognised estimate: {raw!r}')


def parse_table(raw, expected):
    if raw.lstrip().startswith('|'):
        rows = [[cell.strip() for cell in line.strip().strip('|').split('|')]
                for line in raw.strip().splitlines() if line.strip()]
        rows = [row for row in rows if not all(re.fullmatch(r'[:\s-]+', cell) for cell in row)]
    else:
        rows = list(csv.reader(io.StringIO(raw), delimiter='\t'))
    if not rows:
        raise ValueError('Empty source table')
    header = [cell.strip() for cell in rows[0]]
    current = [index for index, cell in enumerate(header) if cell.lower().startswith('current')]
    if not header or header[0] != 'Category' or len(current) != 1:
        raise ValueError('Expected exactly one current-estimate column')
    estimates = {}
    for row in rows[1:]:
        if not row or not any(cell.strip() for cell in row):
            continue
        if len(row) != len(header):
            raise ValueError(f'Misaligned source row: {row}')
        label = row[0].strip()
        if label not in ALIASES:
            raise ValueError(f'New category needs review: {label}')
        category = ALIASES[label]
        if category in estimates:
            raise ValueError(f'Duplicate category: {label}')
        estimates[category] = parse_estimate(row[current[0]])
    if set(estimates) != set(expected):
        raise ValueError(f'Category set changed; review required: {set(estimates) ^ set(expected)}')
    return estimates


def parse_report(post, markup, raw, table_url, previous, labels):
    page = PostHTML()
    page.feed(markup)
    text = re.sub(r'\s+', ' ', ' '.join(page.text))
    dates = set(re.findall(r'Current date:\s*(?:Saturday,\s*)?([A-Za-z]+ \d{1,2}, \d{4})', text))
    if len(dates) != 1:
        raise ValueError('Missing or ambiguous forecast date')
    forecast_date = datetime.strptime(dates.pop(), '%B %d, %Y').date()
    published = datetime.fromisoformat(post['post_date'].replace('Z', '+00:00'))
    if not previous['date'] < forecast_date.isoformat() <= published.date().isoformat():
        raise ValueError('Forecast date is out of sequence')
    if published.date() > date.today():
        raise ValueError('Future publication date')
    model = (post.get('subtitle') or '').removeprefix('Model Used: ').strip()
    if not model:
        raise ValueError('Missing model attribution')
    estimates = parse_table(raw, previous['estimates'])
    notes = []
    for category, point in estimates.items():
        old = previous['estimates'][category]
        if any(old.get(key) != point.get(key) for key in ('central', 'low', 'high', 'status')):
            notes.append(f'{labels[category]}: {old["raw"]} → {point["raw"]}.')
    if model != previous['model']:
        notes.append(f'Model: {previous["model"]} → {model}.')
    if not notes:
        notes.append('No changes to central estimates, ranges or tracked statuses.')
    return dict(date=forecast_date.isoformat(), published=post['post_date'],
                title=post['title'], model=model, url=post['canonical_url'],
                tableUrl=table_url, imageUrl=None, notes=notes, estimates=estimates)


def refresh(data, download=fetch):
    known = {report['url'] for report in data['reports']}
    posts = []
    items = ElementTree.fromstring(download(SOURCE + '/feed')).findall('./channel/item')
    if not items:
        raise ValueError('Missing or empty RSS feed')
    for item in items:
        url = item.findtext('link')
        if url in known:
            break
        title = item.findtext('title', '')
        if re.search(r'\btimeline\s+estimates?\b', title, re.I):
            posts.append(dict(canonical_url=url, title=title,
                              post_date=parsedate_to_datetime(item.findtext('pubDate')).isoformat(),
                              subtitle=item.findtext('description', ''),
                              markup=item.findtext('{http://purl.org/rss/1.0/modules/content/}encoded', '')))
    else:
        raise ValueError('RSS feed no longer overlaps the existing history; review required')
    # Work on a copy so a malformed later post cannot partially update the archive.
    result = {**data, 'reports': list(data['reports'])}
    labels = {category['id']: category['label'] for category in data['categories']}
    for post in reversed(posts):
        if not re.fullmatch(SOURCE + r'/p/[a-z0-9-]+', post['canonical_url']):
            raise ValueError('Unexpected post URL')
        markup = post['markup']
        page = PostHTML()
        page.feed(markup)
        if not page.tables:
            raise ValueError(f'No downloadable forecast table: {post["canonical_url"]}')
        # The first embed is the estimate table; unexpected schemas stop publication.
        table_url = page.tables[0]
        report = parse_report(post, markup, download(table_url), table_url,
                              result['reports'][-1], labels)
        result['reports'].append(report)
    if posts:
        result['retrieved'] = date.today().isoformat()
    return result


if __name__ == '__main__':
    original = json.loads(DATA.read_text())
    updated = refresh(original)
    if updated != original:
        temporary = DATA.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + '\n')
        temporary.replace(DATA)
    print(f'Added {len(updated["reports"]) - len(original["reports"])} update(s); '
          f'latest forecast {updated["reports"][-1]["date"]}.')
