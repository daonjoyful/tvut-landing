const engines=['naver','google','bing'];
const statuses=['요청함','색인 확인','확인 필요','요청 실패','색인완료','미색인'];
async function ensure(db){await db.prepare('CREATE TABLE IF NOT EXISTS admin_index_history (id TEXT PRIMARY KEY, engine TEXT NOT NULL, path TEXT NOT NULL, work_date TEXT NOT NULL, status TEXT NOT NULL, method TEXT NOT NULL, created TEXT NOT NULL)').run();}
export function koreaDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export async function saveIndexHistory(db,{engine,path,workDate,status,method}){
  if(!engines.includes(engine)||!statuses.includes(status)||!['수동 기록','IndexNow'].includes(method)||!/^\d{4}-\d{2}-\d{2}$/.test(workDate)||isNaN(Date.parse(workDate))||new Date(workDate).toISOString().slice(0,10)!==workDate||workDate>koreaDate())throw Error('작업 날짜 또는 상태를 확인해 주세요.');
  await ensure(db);await db.prepare('INSERT INTO admin_index_history(id,engine,path,work_date,status,method,created) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),engine,path,workDate,status,method,new Date().toISOString()).run();
}
export async function readIndexHistory(db,engine){if(!engines.includes(engine))throw Error('검색엔진 오류');await ensure(db);return (await db.prepare('SELECT path,work_date,status,method,created FROM admin_index_history WHERE engine=? ORDER BY work_date DESC,created DESC LIMIT 100').bind(engine).all()).results;}
