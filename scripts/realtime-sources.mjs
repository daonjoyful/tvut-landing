import entries from '../functions/admin/catalog.json';

const allowedSources = new Set(['naver-search','naver-other','google-search','daum-search','bing-search','ai-chatgpt','ai-claude','ai-perplexity','ai-other','external','internal','unknown']);
const fixedPaths = new Set(['/','/review/','/review/notice/',...entries.map(e=>e.url)]);
const initialized = new WeakMap();
export function ensureSourceTable(db) {
  if (!initialized.has(db)) initialized.set(db,db.prepare('CREATE TABLE IF NOT EXISTS realtime_source_counts (minute INTEGER NOT NULL, source TEXT NOT NULL, path TEXT NOT NULL, views INTEGER NOT NULL, PRIMARY KEY(minute,source,path))').run().catch(error=>{ initialized.delete(db); throw error; }));
  return initialized.get(db);
}
export async function allowedPublicPath(db,path) {
  if (typeof path !== 'string' || path.length>180) return false;
  if (fixedPaths.has(path)) return true;
  const match=path.match(/^\/review\/notice\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/);
  if (!match || match[1].length>80) return false;
  try { const row=await db.prepare('SELECT published FROM admin_articles WHERE slug=?').bind(match[1]).first(); return Boolean(row?.published); } catch { return false; }
}
export async function recordSource(db,source,path,now=Date.now()) {
  if (!allowedSources.has(source) || !await allowedPublicPath(db,path)) return false;
  await ensureSourceTable(db);
  const minute=Math.floor(now/60000);
  await db.prepare('INSERT INTO realtime_source_counts(minute,source,path,views) VALUES(?,?,?,1) ON CONFLICT(minute,source,path) DO UPDATE SET views=views+1').bind(minute,source,path).run();
  // Old aggregate buckets are removed opportunistically; no visitor identifiers are retained.
  if (Math.random()<0.02) { try { await db.prepare('DELETE FROM realtime_source_counts WHERE minute<?').bind(minute-1440).run(); } catch {} }
  return true;
}
export async function readSources(db,now=Date.now()) {
  await ensureSourceTable(db);
  const minute=Math.floor(now/60000);
  const rows=await db.prepare('SELECT source,path,SUM(views) AS views FROM realtime_source_counts WHERE minute>=? AND minute<=? GROUP BY source,path ORDER BY views DESC,source,path LIMIT 40').bind(minute-29,minute).all();
  return {rows:(rows.results||[]).map(row=>({source:row.source,path:row.path,views:Number(row.views)})),checkedAt:new Date(now).toISOString()};
}
