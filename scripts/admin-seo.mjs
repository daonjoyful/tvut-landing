export const SITE = 'https://tvut.3678dairy.com';
export const INDEXNOW_KEY = '9a0981edb3775e89e4ac0c6292f36c31';

// Only site-owned paths from the published catalog can be checked or submitted.
export function allowedPath(path, entries) {
  return typeof path === 'string' && (path === '/' || entries.some(entry => entry.url === path)) && path.startsWith('/') && !path.startsWith('//') && !/[?#\\]/.test(path);
}

function attributes(tag) {
  const out = {};
  for (const m of tag.matchAll(/([^\s=<>"'`]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4];
  return out;
}

export function inspectHtml(html, path, status = 200, robotsHeader = '') {
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1] || '').replace(/<!--[\s\S]*?-->/g,'');
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => attributes(m[0]));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(m => attributes(m[0]));
  const meta = name => metas.find(m => (m.name || m.property || '').toLowerCase() === name)?.content?.trim() || '';
  const canonical = links.find(m => (m.rel || '').toLowerCase().split(/\s+/).includes('canonical'))?.href || '';
  let canonicalUrl = '';
  try { if (canonical) canonicalUrl = new URL(canonical,SITE + path).href; } catch {}
  return {status,title:head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.trim() || '',description:meta('description'),image:meta('og:image'),canonical,canonicalMatches:canonicalUrl === SITE + path, robots:meta('robots'),robotsHeader,hasNoindex:/\bnoindex\b/i.test(meta('robots') + ' ' + robotsHeader)};
}

export async function diagnose(path, entries, request = fetch) {
  if (!allowedPath(path,entries)) throw Error('목록에 있는 공개 페이지만 진단할 수 있습니다.');
  const response = await request(SITE + path, {redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});
  if (Number(response.headers.get('content-length')) > 1000000) throw Error('페이지가 너무 커서 진단할 수 없습니다.');
  const reader = response.body?.getReader(); let data = '', size = 0; const decoder = new TextDecoder();
  if (reader) { try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 1000000) { await reader.cancel(); throw Error('페이지가 너무 커서 진단할 수 없습니다.'); } data += decoder.decode(part.value,{stream:true}); } data += decoder.decode(); } finally { reader.releaseLock(); } }
  return inspectHtml(data,path,response.status,response.headers.get('x-robots-tag') || '');
}

export async function submitIndexNow(path, entries, request = fetch) {
  if (!allowedPath(path,entries)) throw Error('목록에 있는 공개 페이지만 제출할 수 있습니다.');
  const response = await request('https://searchadvisor.naver.com/indexnow', {method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:'tvut.3678dairy.com',key:INDEXNOW_KEY,urlList:[SITE + path]})});
  return response.status;
}
