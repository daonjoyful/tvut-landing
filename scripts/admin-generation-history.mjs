async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_generation_history (id TEXT PRIMARY KEY, created TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, body TEXT NOT NULL)').run();
}
export async function recordGeneration(db, title, description, body) {
  await ensure(db);
  const id=crypto.randomUUID();
  await db.prepare('INSERT INTO admin_generation_history(id,created,title,description,body) VALUES(?,?,?,?,?)').bind(id,new Date().toISOString(),title,description,body).run();
  return id;
}
export async function generationHistory(db) {
  await ensure(db);
  return (await db.prepare('SELECT id,created,title FROM admin_generation_history ORDER BY created DESC LIMIT 200').all()).results;
}
export async function generationDetail(db,id) {
  if(!/^[0-9a-f-]{36}$/.test(id||''))return null;
  await ensure(db);
  return db.prepare('SELECT id,created,title,description,body FROM admin_generation_history WHERE id=?').bind(id).first();
}
