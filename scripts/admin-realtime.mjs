const PROPERTY = '562387220';

export async function fetchRealtime(env, request = fetch) {
  if (!env.TVUT_GA_CREDENTIALS) throw Error('GA4 연결이 필요합니다.');
  const credentials = JSON.parse(env.TVUT_GA_CREDENTIALS);
  const token = await request('https://oauth2.googleapis.com/token', {
    method:'POST',body:new URLSearchParams({client_id:credentials.client_id,client_secret:credentials.client_secret,refresh_token:credentials.refresh_token,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)
  });
  if (!token.ok) throw Error('GA4 인증을 확인해 주세요.');
  const {access_token} = await token.json();
  if (!access_token) throw Error('GA4 인증을 확인해 주세요.');
  const report = async body => {
    const result = await request('https://analyticsdata.googleapis.com/v1beta/properties/'+PROPERTY+':runRealtimeReport',{
      method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
    });
    if (!result.ok) throw Error(result.status===429?'GA4 실시간 조회 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.':'GA4 실시간 통계를 조회하지 못했습니다.');
    return result.json();
  };
  const [total,pages] = await Promise.all([
    report({metrics:[{name:'activeUsers'}]}),
    report({dimensions:[{name:'unifiedScreenName'}],metrics:[{name:'screenPageViews'}],orderBys:[{metric:{metricName:'screenPageViews'},desc:true}],limit:20})
  ]);
  const count = value => { const n=Number(value); if (!Number.isSafeInteger(n)||n<0) throw Error('GA4 응답을 확인할 수 없습니다.'); return n; };
  return {activeUsers:total.rows?.length ? count(total.rows[0]?.metricValues?.[0]?.value) : 0,
    pages:(pages.rows || []).map(row=>({title:String(row.dimensionValues?.[0]?.value || '(제목 없음)').slice(0,500),views:count(row.metricValues?.[0]?.value)})),
    checkedAt:new Date().toISOString()};
}
