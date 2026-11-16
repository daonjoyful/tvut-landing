import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

root = Path(__file__).resolve().parent.parent
origin = 'https://tvut.3678dairy.com'
class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.href = None
        self.text = []
        self.items = []
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.href = dict(attrs).get('href')
            self.text = []
    def handle_data(self, data):
        if self.href is not None:
            self.text.append(data)
    def handle_endtag(self, tag):
        if tag == 'a' and self.href is not None:
            self.items.append((self.href, ' '.join(' '.join(self.text).split())))
            self.href = None

pages = [p for p in root.rglob('index.html') if not any(part.startswith('.') or part == 'node_modules' for part in p.relative_to(root).parts)]
result = {}
for page in pages:
    source = '/' + page.relative_to(root).as_posix().removesuffix('index.html')
    parser = Links()
    parser.feed(page.read_text(encoding='utf-8'))
    for href, label in parser.items:
        absolute = urljoin(origin + source, href)
        parsed = urlsplit(absolute)
        if parsed.scheme not in ('http', 'https') or not parsed.netloc:
            continue
        item = result.setdefault(absolute, {'url': absolute, 'labels': [], 'sources': []})
        if label and label not in item['labels']: item['labels'].append(label)
        if source not in item['sources']: item['sources'].append(source)
output = root / 'functions' / 'admin' / 'link-inventory.json'
output.write_text(json.dumps(list(result.values()), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(pages)} source pages, {len(result)} distinct destinations')
