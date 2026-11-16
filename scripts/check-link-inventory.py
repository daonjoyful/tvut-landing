import concurrent.futures, json, pathlib, urllib.request, urllib.error, urllib.parse, time
root=pathlib.Path(__file__).resolve().parent.parent
inventory=json.loads((root/'functions/admin/link-inventory.json').read_text(encoding='utf-8'))
urls=sorted({urllib.parse.urldefrag(x['url'])[0] for x in inventory if urllib.parse.urlsplit(x['url']).scheme in ('http','https')})
def check(url):
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; LinkCheck/1.0)'},method='GET')
        with urllib.request.urlopen(req,timeout=12) as resp:
            return {'url':url,'status':resp.status,'final':resp.geturl()}
    except urllib.error.HTTPError as e:return {'url':url,'status':e.code,'final':e.geturl()}
    except Exception as e:return {'url':url,'error':str(e)[:180]}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results=list(pool.map(check,urls))
out=root.parent/'tvut-link-check.json'
out.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Checked {len(results)} addresses; results: {out}')
for x in results:
    if x.get('status',0)>=400 or 'error' in x: print(json.dumps(x,ensure_ascii=False))
