const rates={'gpt-4.1-mini':{input:0.4,cached:0.1,output:1.6}};
export function calculateUsage(usage,model='gpt-4.1-mini') {
  const input=usage?.input_tokens, output=usage?.output_tokens, cached=usage?.input_tokens_details?.cached_tokens ?? 0;
  if (![input,output,cached].every(Number.isSafeInteger)||input<0||output<0||cached<0||cached>input) throw Error('사용량 정보가 없습니다.');
  const price=rates[model];
  return {input,output,cached,cost:price?((input-cached)*price.input+cached*price.cached+output*price.output)/1000000:null};
}
async function ensure(db){await db.prepare('CREATE TABLE IF NOT EXISTS admin_ai_usage (id TEXT PRIMARY KEY, created TEXT NOT NULL, model TEXT NOT NULL, input INTEGER NOT NULL, cached INTEGER NOT NULL, output INTEGER NOT NULL, cost REAL)').run();await db.prepare('CREATE TABLE IF NOT EXISTS admin_ai_usage_titles (usage_id TEXT PRIMARY KEY, title TEXT NOT NULL)').run();}
export async function recordAiUsage(db,usage,model='gpt-4.1-mini',title='') {
  const value=calculateUsage(usage,model); await ensure(db);
  const id=crypto.randomUUID();
  await db.batch([db.prepare('INSERT INTO admin_ai_usage(id,created,model,input,cached,output,cost) VALUES(?,?,?,?,?,?,?)').bind(id,new Date().toISOString(),model,value.input,value.cached,value.output,value.cost),db.prepare('INSERT INTO admin_ai_usage_titles(usage_id,title) VALUES(?,?)').bind(id,String(title).slice(0,150))]);
  return value;
}
export async function readAiUsage(db) {
  await ensure(db);
  const fields='COUNT(*) AS calls, COALESCE(SUM(input),0) AS input, COALESCE(SUM(cached),0) AS cached, COALESCE(SUM(output),0) AS output, COALESCE(SUM(cost),0) AS cost, SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) AS unknown';
  const all=await db.prepare('SELECT '+fields+', MIN(created) AS first, MAX(created) AS last FROM admin_ai_usage').first();
  const today=await db.prepare("SELECT "+fields+" FROM admin_ai_usage WHERE date(created,'+9 hours')=date('now','+9 hours')").first();
  const month=await db.prepare("SELECT "+fields+" FROM admin_ai_usage WHERE strftime('%Y-%m',created,'+9 hours')=strftime('%Y-%m','now','+9 hours')").first();
  const days=await db.prepare("SELECT date(created,'+9 hours') AS day, "+fields+" FROM admin_ai_usage GROUP BY day ORDER BY day DESC LIMIT 30").all();
  const details=await db.prepare('SELECT u.created,u.model,u.input,u.cached,u.output,u.cost,t.title FROM admin_ai_usage u LEFT JOIN admin_ai_usage_titles t ON t.usage_id=u.id ORDER BY u.created DESC LIMIT 100').all();
  return {all,today,month,days:days.results,details:details.results};
}
export async function readExchangeRate(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_exchange_rate (id INTEGER PRIMARY KEY, rate REAL NOT NULL, rate_date TEXT NOT NULL, fetched TEXT NOT NULL)').run();
  const saved=await db.prepare('SELECT rate,rate_date,fetched FROM admin_exchange_rate WHERE id=1').first();
  if(saved && Date.now()-Date.parse(saved.fetched)<3600000) return {...saved,stale:false};
  try {
    const response=await fetch('https://api.frankfurter.dev/v2/rate/USD/KRW',{signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('환율 응답 오류');
    const data=await response.json(),rate=Number(data.rate),rateDate=String(data.date||'');
    if(!Number.isFinite(rate)||rate<=0||rate>100000||!/^\d{4}-\d{2}-\d{2}$/.test(rateDate))throw Error('환율 형식 오류');
    const fetched=new Date().toISOString();
    await db.prepare('INSERT INTO admin_exchange_rate(id,rate,rate_date,fetched) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET rate=excluded.rate,rate_date=excluded.rate_date,fetched=excluded.fetched').bind(rate,rateDate,fetched).run();
    return {rate,rate_date:rateDate,fetched,stale:false};
  }catch{return saved?{...saved,stale:true}:null;}
}
