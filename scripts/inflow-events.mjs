// Only explicit non-identifying values cross the browser/server boundary.
export const safeTerms = ['티벗','티벗 퀴즈','티벗퀴즈','티벗 앱 설치','티벗 설치','아침마당 티벗','아침마당 티벗퀴즈','생생정보 티벗','생생정보 퀴즈','생생정보 티벗퀴즈','무엇이든 물어보세요 티벗','6시 내고향 퀴즈','6시내고향오늘퀴즈','6시내고향 오늘퀴즈'];
const terms=new Set(['not_provided','other',...safeTerms]);
const hosts=new Set(['not_provided','internal','other','search.naver.com','m.search.naver.com','naver.com','www.naver.com','m.naver.com','blog.naver.com','m.blog.naver.com','google.com','www.google.com','google.co.kr','www.google.co.kr','google.com.au','www.google.com.au','google.co.jp','www.google.co.jp','google.co.uk','www.google.co.uk','search.daum.net','m.search.daum.net','bing.com','www.bing.com','chatgpt.com','chat.openai.com','claude.ai','perplexity.ai','gemini.google.com','copilot.microsoft.com']);
const sources=new Set(['not_provided','other','naver','google','daum','bing','kakao','youtube','instagram','facebook','chatgpt','direct']);
const campaigns=new Set(['not_provided','other','tvut','amplaza','reallive','whatever','sixhour']);
const empty = {host:'not_provided',search:'not_provided',utmSource:'not_provided',utmTerm:'not_provided',campaign:'not_provided'};
const ready = new WeakMap();
export function validDetail(detail) {
  if (detail == null) return {...empty};
  if (typeof detail!=='object' || Array.isArray(detail) || Object.keys(detail).sort().join(',')!=='campaign,host,search,utmSource,utmTerm') return null;
  if (!hosts.has(detail.host)||!terms.has(detail.search)||!sources.has(detail.utmSource)||!terms.has(detail.utmTerm)||!campaigns.has(detail.campaign)) return null;
  return detail;
}
export function ensureEventTable(db) {
  if (!ready.has(db)) ready.set(db,(async()=>{
    await db.prepare('CREATE TABLE IF NOT EXISTS inflow_events (id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at INTEGER NOT NULL, source TEXT NOT NULL, path TEXT NOT NULL, host TEXT NOT NULL, search TEXT NOT NULL, utm_source TEXT NOT NULL, utm_term TEXT NOT NULL, campaign TEXT NOT NULL)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS inflow_events_time ON inflow_events(occurred_at)').run();
  })().catch(error=>{ready.delete(db);throw error;}));
  return ready.get(db);
}
export async function recordEvent(db,source,path,detail,now=Date.now()) {
  await ensureEventTable(db);
  const safe=validDetail(detail); if (!safe) return false;
  await db.batch([
    db.prepare('INSERT INTO inflow_events(occurred_at,source,path,host,search,utm_source,utm_term,campaign) VALUES(?,?,?,?,?,?,?,?)').bind(now,source,path,safe.host,safe.search,safe.utmSource,safe.utmTerm,safe.campaign),
    db.prepare('DELETE FROM inflow_events WHERE occurred_at<?').bind(now-7*86400000)
  ]);
  return true;
}
export async function readEvents(db,{source='',path=''}={},now=Date.now()) {
  await ensureEventTable(db);
  await db.prepare('DELETE FROM inflow_events WHERE occurred_at<?').bind(now-7*86400000).run();
  const query='SELECT occurred_at,source,path,host,search,utm_source,utm_term,campaign FROM inflow_events WHERE occurred_at>=? AND occurred_at<=? AND (?=\'\' OR source=?) AND (?=\'\' OR instr(path,?)>0) ORDER BY occurred_at DESC,id DESC LIMIT 200';
  const result=await db.prepare(query).bind(now-7*86400000,now,source,source,path,path).all();
  return {rows:result.results||[],checkedAt:new Date(now).toISOString()};
}
