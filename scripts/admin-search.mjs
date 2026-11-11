const ranges = {today:1,yesterday:1,'7days':7,'14days':14,'30days':30,'60days':60,'90days':90};
function dateAt(offset) {
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const date = new Date(today + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()-offset);
  return date.toISOString().slice(0,10);
}
export async function fetchSearch(env, period) {
  if (!env.TVUT_GSC_CREDENTIALS) return null;
  const credentials = JSON.parse(env.TVUT_GSC_CREDENTIALS);
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:credentials.client_id,client_secret:credentials.client_secret,refresh_token:credentials.refresh_token,grant_type:'refresh_token'})});
  if (!tokenResponse.ok) throw Error('Google 검색 실적 연결을 확인해 주세요.');
  const token = await tokenResponse.json();
  const endOffset = period === 'yesterday' ? 1 : 0;
  const response = await fetch('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent('https://tvut.3678dairy.com/')+'/searchAnalytics/query',{
    method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({startDate:dateAt(endOffset+(ranges[period] || 30)-1),endDate:dateAt(endOffset),dimensions:['query','page'],rowLimit:1000,type:'web'})
  });
  if (!response.ok) throw Error('Google 검색 실적을 조회하지 못했습니다.');
  const data = await response.json();
  return (data.rows || []).map(row=>({term:row.keys[0],page:row.keys[1],clicks:row.clicks,impressions:row.impressions}));
}
