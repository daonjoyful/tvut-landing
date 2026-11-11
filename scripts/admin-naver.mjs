// Search Advisor provides separate keyword and URL rankings, not keyword-URL pairs.
export function parseNaverReport(raw) {
  const data = JSON.parse(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated || '') || !['1','7','30','60','90'].includes(String(data.days))) throw Error('기준일과 기간을 확인해 주세요.');
  for (const kind of ['keywords','pages']) {
    if (!Array.isArray(data[kind]) || data[kind].length > 30) throw Error('각 목록은 최대 30개여야 합니다.');
    data[kind] = data[kind].map(row => {
      if (!row || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 500 || !Number.isSafeInteger(row.clicks) || row.clicks < 0 || !Number.isSafeInteger(row.impressions) || row.impressions < 0) throw Error('검색어 또는 페이지 자료를 확인해 주세요.');
      if (kind === 'pages') { const u = new URL(row.name); if (u.origin !== 'https://tvut.3678dairy.com') throw Error('티벗 사이트 페이지 주소만 저장할 수 있습니다.'); }
      return {name:row.name.trim(),clicks:row.clicks,impressions:row.impressions};
    });
  }
  return {updated:data.updated,days:String(data.days),keywords:data.keywords,pages:data.pages};
}
export async function saveNaverReport(db, raw) {
  const report = parseNaverReport(raw);
  await db.prepare('CREATE TABLE IF NOT EXISTS naver_reports (days TEXT PRIMARY KEY, updated TEXT NOT NULL, saved TEXT NOT NULL, data TEXT NOT NULL)').run();
  await db.prepare('INSERT INTO naver_reports(days,updated,saved,data) VALUES(?,?,?,?) ON CONFLICT(days) DO UPDATE SET updated=excluded.updated,saved=excluded.saved,data=excluded.data WHERE excluded.updated >= naver_reports.updated').bind(report.days,report.updated,new Date().toISOString(),JSON.stringify(report)).run();
}
export async function readNaverReport(db, days) {
  try { const row = await db.prepare('SELECT saved,data FROM naver_reports WHERE days=?').bind(String(days)).first(); return row ? {...JSON.parse(row.data),saved:row.saved} : null; }
  catch (error) { if (/no such table/i.test(error.message)) return null; throw error; }
}
