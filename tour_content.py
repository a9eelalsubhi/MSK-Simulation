import json
from pathlib import Path
root=Path(__file__).parent
tour=json.loads((root/'tour-source.json').read_text(encoding='utf8'))
assert len(tour['steps'])==65
(root/'public/tour.json').write_text(json.dumps(tour,ensure_ascii=False,indent=2),encoding='utf8')
(root/'public/topics.json').write_text(json.dumps(tour['topics'],ensure_ascii=False,indent=2),encoding='utf8')
print('English visual tour:',len(tour['steps']),'steps')
