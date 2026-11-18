import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from refresh import parse_table, refresh, SOURCE

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = json.loads((ROOT / 'data/forecasts.json').read_text())
TABLE = (ROOT / 'tests/fixtures/2026-11-17.tsv').read_text()
BASE = {**ARCHIVE, 'reports': [report for report in ARCHIVE['reports'] if report['date'] <= '2026-11-10']}
POST = next(report for report in ARCHIVE['reports'] if report['date'] == '2026-11-17')


class RefreshTests(unittest.TestCase):
    def test_current_column_is_found_by_name_not_position(self):
        points = parse_table(TABLE, BASE['reports'][-1]['estimates'])
        self.assertEqual(points['research'], {'status': 'Achieved', 'raw': 'Achieved'})
        self.assertEqual(points['rsi']['high'], 2029)
        self.assertEqual(points['neural']['central'], 2032)
        old_layout = '| Category | First | Previous | Current estimate |\n|---|---|---|---|\n| AGI | 2030 (2027–2035) | 2029 (2027–2032) | **2028 (2027–2031)** |'
        self.assertEqual(parse_table(old_layout, ['agi'])['agi']['central'], 2028)

    def test_unknown_or_incomplete_tables_fail_instead_of_publishing(self):
        for invalid in (
            TABLE.replace('AGI\t', 'Unknown milestone\t', 1),
            '\n'.join(TABLE.splitlines()[:-1]),
            TABLE.replace('2026 (2026–2028)', '2026 (2028–2029)', 1),
            TABLE.replace('Achieved\t', 'Almost ready\t', 1),
        ):
            with self.subTest(table=invalid[:80]), self.assertRaises(ValueError):
                parse_table(invalid, BASE['reports'][-1]['estimates'])

    def test_append_preserves_history_and_second_run_is_a_noop(self):
        post = {'canonical_url': POST['url'], 'post_date': POST['published'],
                'title': POST['title'], 'subtitle': 'Model Used: ' + POST['model']}
        urls = {
            SOURCE + '/api/v1/archive': json.dumps({'posts': [post, {'canonical_url': BASE['reports'][-1]['url']}]}),
            POST['url']: '<script>Current date: Wrong</script><p>Current date: November 17, 2026</p><iframe src="https://datawrapper.dwcdn.net/60l3e/1/"></iframe>',
            POST['tableUrl']: TABLE,
        }
        original = copy.deepcopy(BASE)
        result = refresh(BASE, urls.__getitem__)
        self.assertEqual(BASE, original)
        self.assertEqual(result['reports'][:-1], original['reports'])
        self.assertEqual(result['reports'][-1]['date'], '2026-11-17')
        self.assertEqual(result['reports'][-1]['estimates'], POST['estimates'])
        self.assertEqual(refresh(result, urls.__getitem__), result)
        urls[POST['tableUrl']] = TABLE.replace('AGI\t', 'Unknown\t', 1)
        with self.assertRaises(ValueError):
            refresh(BASE, urls.__getitem__)
        self.assertEqual(BASE, original)


if __name__ == '__main__':
    unittest.main()
