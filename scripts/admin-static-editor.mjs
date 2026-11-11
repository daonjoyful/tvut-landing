const ORIGIN = 'https://tvut.3678dairy.com';
const tokenPattern = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<(h1|h2|h3|p)\b([^>]*)>([^<>]*)<\/\1\s*>/gi;
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function decode(text) {
  const names = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'};
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(m,key)=>{
    if (key[0] !== '#') return names[key.toLowerCase()] || m;
    const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
    return n>0 && n<=0x10ffff && !(n>=0xd800 && n<=0xdfff) ? String.fromCodePoint(n) : m;
  });
}
export function permitted(path,entries) { return typeof path === 'string' && entries.some(e=>e.url===path) && path.startsWith('/review/') && !/[?#\\]/.test(path); }
export function fields(html) {
  const out=[];
  for (const m of html.matchAll(tokenPattern)) {
    if (!m[1] || !m[3].trim() || /\bad-label\b/i.test(m[2]) || decode(m[3]).trim()==='광고') continue;
    if (out.length >= 120) throw Error('편집 가능한 문장이 너무 많습니다.');
    out.push({tag:m[1].toLowerCase(),text:decode(m[3]),index:out.length});
  }
  return out;
}
export async function fingerprint(html) {
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(html));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function applyChanges(html, edits) {
  let index=0;
  return html.replace(tokenPattern,(full,tag,attrs,text)=>{
    if (!tag || !text.trim() || /\bad-label\b/i.test(attrs) || decode(text).trim()==='광고') return full;
    const value=edits[index++];
    if (typeof value !== 'string' || value === decode(text)) return full;
    return full.slice(0,full.indexOf('>')+1)+esc(value)+full.slice(full.lastIndexOf('</'));
  });
}
export async function originalPage(path,entries,request=fetch) {
  if (!permitted(path,entries)) throw Error('수정할 수 없는 페이지입니다.');
  const response=await request(ORIGIN+path+'?__editor_original=1',{redirect:'manual',signal:AbortSignal.timeout(10000)});
  if (response.status!==200 || !/text\/html/i.test(response.headers.get('content-type')||'')) throw Error('원본 페이지를 불러오지 못했습니다.');
  const html=await response.text();
  if (new TextEncoder().encode(html).length>300000) throw Error('페이지가 너무 커서 편집할 수 없습니다.');
  return html;
}
export async function ensureStatic(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_static_edits (path TEXT PRIMARY KEY, source_hash TEXT NOT NULL, draft TEXT NOT NULL, published TEXT, version TEXT NOT NULL, published_at TEXT)').run();
}
export async function getStatic(db,path) { await ensureStatic(db); return db.prepare('SELECT path,source_hash,draft,published,version,published_at FROM admin_static_edits WHERE path=?').bind(path).first(); }
export async function getStaticExisting(db,path) { return db.prepare('SELECT path,source_hash,draft,published,version,published_at FROM admin_static_edits WHERE path=?').bind(path).first(); }
export async function saveStatic(db,path,entries,form,request=fetch) {
  if (!permitted(path,entries)) throw Error('수정할 수 없는 페이지입니다.');
  const html=await originalPage(path,entries,request), hash=await fingerprint(html), parts=fields(html), existing=await getStatic(db,path);
  if (form.get('source_hash')!==hash) throw Error('원본 페이지가 변경되었습니다. 내용을 복사한 뒤 다시 불러와 주세요.');
  if (existing && form.get('version')!==existing.version) throw Error('다른 수정 사항이 있습니다. 내용을 복사한 뒤 다시 불러와 주세요.');
  const edits=parts.map((_,i)=>form.get('field_'+i));
  if (!parts.length || edits.some(x=>typeof x!=='string'||x.length>5000)) throw Error('입력한 내용을 확인해 주세요.');
  if (existing?.published && existing.source_hash!==hash) throw Error('원본이 변경되어 기존 수정본을 다시 확인해야 합니다.');
  const version=crypto.randomUUID();
  if (existing) {
    const r=await db.prepare('UPDATE admin_static_edits SET source_hash=?,draft=?,version=? WHERE path=? AND version=?').bind(hash,JSON.stringify(edits),version,path,existing.version).run();
    if(r.meta.changes!==1) throw Error('다른 수정 사항이 있습니다. 다시 불러와 주세요.');
  } else await db.prepare('INSERT INTO admin_static_edits(path,source_hash,draft,version) VALUES(?,?,?,?)').bind(path,hash,JSON.stringify(edits),version).run();
}
export async function publishStatic(db,path,entries,version,request=fetch) {
  if (!permitted(path,entries)) throw Error('수정할 수 없는 페이지입니다.');
  const row=await getStatic(db,path), html=await originalPage(path,entries,request);
  if (!row || row.version!==version || await fingerprint(html)!==row.source_hash) throw Error('원본 또는 수정본이 바뀌었습니다. 다시 확인해 주세요.');
  const r=await db.prepare('UPDATE admin_static_edits SET published=draft,published_at=? WHERE path=? AND version=?').bind(new Date().toISOString(),path,version).run();
  if(r.meta.changes!==1) throw Error('수정본이 바뀌었습니다. 다시 확인해 주세요.');
}
export async function restoreStatic(db,path,entries,version) {
  if (!permitted(path,entries)) throw Error('수정할 수 없는 페이지입니다.');
  const r=await db.prepare('UPDATE admin_static_edits SET published=NULL,published_at=NULL WHERE path=? AND version=?').bind(path,version).run();
  if(r.meta.changes!==1) throw Error('수정본이 바뀌었습니다. 다시 확인해 주세요.');
}
