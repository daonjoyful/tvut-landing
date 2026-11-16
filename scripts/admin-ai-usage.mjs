const rates={'gpt-4.1-mini':{input:0.4,cached:0.1,output:1.6}};
export function calculateUsage(usage,model='gpt-4.1-mini') {
  const input=usage?.input_tokens, output=usage?.output_tokens, cached=usage?.input_tokens_details?.cached_tokens ?? 0;
  if (![input,output,cached].every(Number.isSafeInteger)||input<0||output<0||cached<0||cached>input) throw Error('사용량 정보가 없습니다.');
  const price=rates[model];
  return {input,output,cached,cost:price?((input-cached)*price.input+cached*price.cached+output*price.output)/1000000:null};
}
async function ensure(db){await db.prepare('CREATE TABLE IF NOT EXISTS admin_ai_usage (id TEXT PRIMARY KEY, created TEXT NOT NULL, model TEXT NOT NULL, input INTEGER NOT NULL, cached INTEGER NOT NULL, output INTEGER NOT NULL, cost REAL)').run();}
export async function recordAiUsage(db,usage,model='gpt-4.1-mini') {
  const value=calculateUsage(usage,model); await ensure(db);
  await db.prepare('INSERT INTO admin_ai_usage(id,created,model,input,cached,output,cost) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),model,value.input,value.cached,value.output,value.cost).run();
  return value;
}
export async function readAiUsage(db) {
  await ensure(db);
  const fields='COUNT(*) AS calls, COALESCE(SUM(input),0) AS input, COALESCE(SUM(cached),0) AS cached, COALESCE(SUM(output),0) AS output, COALESCE(SUM(cost),0) AS cost, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) AS unknown';
  const all=await db.prepare('SELECT '+fields+', MIN(created) AS first, MAX(created) AS last FROM admin_ai_usage').first();
  const today=await db.prepare("SELECT "+fields+" FROM admin_ai_usage WHERE date(created,'+9 hours')=date('now','+9 hours')").first();
  const month=await db.prepare("SELECT "+fields+" FROM admin_ai_usage WHERE strftime('%Y-%m',created,'+9 hours')=strftime('%Y-%m','now','+9 hours')").first();
  const days=await db.prepare("SELECT date(created,'+9 hours') AS day, "+fields+" FROM admin_ai_usage GROUP BY day ORDER BY day DESC LIMIT 30").all();
  return {all,today,month,days:days.results};
}
