async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_generation_history (id TEXT PRIMARY KEY, created TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, body TEXT NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_generation_metadata (id TEXT PRIMARY KEY, keyword TEXT NOT NULL DEFAULT \'\', slug TEXT NOT NULL DEFAULT \'\')').run();
}
export async function recordGeneration(db, title, description, body, keyword='') {
  await ensure(db);
  const id=crypto.randomUUID();
  await db.batch([db.prepare('INSERT INTO admin_generation_history(id,created,title,description,body) VALUES(?,?,?,?,?)').bind(id,new Date().toISOString(),title,description,body),db.prepare('INSERT INTO admin_generation_metadata(id,keyword,slug) VALUES(?,?,\'\')').bind(id,keyword.slice(0,150))]);
  return id;
}
export async function linkGeneration(db,id,slug) {
  if(!/^[0-9a-f-]{36}$/.test(id||'') || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||''))throw Error('잘못된 연결 정보');
  await ensure(db);
  const row=await db.prepare('SELECT id FROM admin_generation_history WHERE id=?').bind(id).first();
  if(!row)throw Error('생성 기록 없음');
  await db.prepare('INSERT INTO admin_generation_metadata(id,keyword,slug) VALUES(?,\'\',?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug').bind(id,slug).run();
}
export async function generationHistory(db) {
  await ensure(db);
  return (await db.prepare('SELECT h.id,h.created,h.title,COALESCE(m.keyword,\'\') AS keyword,COALESCE(m.slug,\'\') AS slug FROM admin_generation_history h LEFT JOIN admin_generation_metadata m ON m.id=h.id ORDER BY h.created DESC LIMIT 200').all()).results;
}
export async function generationDetail(db,id) {
  if(!/^[0-9a-f-]{36}$/.test(id||''))return null;
  await ensure(db);
  return db.prepare('SELECT id,created,title,description,body FROM admin_generation_history WHERE id=?').bind(id).first();
}
