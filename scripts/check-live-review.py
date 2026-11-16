import json, pathlib, urllib.request, urllib.parse
from html.parser import HTMLParser
root=pathlib.Path(__file__).resolve().parent.parent
origin='https://tvut.3678dairy.com'
class Parser(HTMLParser):
 def __init__(self): super().__init__(); self.links=[]
 def handle_starttag(self,t,a):
  if t=='a':
   h=dict(a).get('href')
   if h:self.links.append(h)
entries=json.loads((root/'functions/admin/catalog.json').read_text(encoding='utf-8'))
inventory=json.loads((root/'functions/admin/link-inventory.json').read_text(encoding='utf-8'))
paths=sorted({'/','/review/','/review/notice/'}|{x['url'] for x in entries}|{p for item in inventory for p in item['sources'] if p.startswith('/')})
result=[]
for path in paths:
 try:
  with urllib.request.urlopen(urllib.request.Request(origin+path,headers={'User-Agent':'Mozilla/5.0'}),timeout=15) as response:
   p=Parser();p.feed(response.read().decode('utf-8','replace'))
   result.append({'path':path,'status':response.status,'links':[urllib.parse.urljoin(origin+path,x) for x in p.links]})
 except Exception as e: result.append({'path':path,'error':str(e)})
out=root.parent/'tvut-live-review-links.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print('checked pages:',len(result),'failed:',[x for x in result if 'error' in x])
print('published links:',sum(len(x.get('links',[])) for x in result))
