const PROPERTY = '562387220';
const ranges = {today:'today', yesterday:'yesterday', '7days':'6daysAgo', '14days':'13daysAgo', '30days':'29daysAgo', '60days':'59daysAgo', '90days':'89daysAgo'};

export async function fetchAnalytics(env, period) {
  if (!env.TVUT_GA_CREDENTIALS) throw Error('방문 통계 연결을 준비하고 있습니다.');
  const credentials = JSON.parse(env.TVUT_GA_CREDENTIALS);
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST',
    body:new URLSearchParams({client_id:credentials.client_id,client_secret:credentials.client_secret,refresh_token:credentials.refresh_token,grant_type:'refresh_token'})
  });
  if (!tokenResponse.ok) throw Error('Google 통계 연결을 확인해 주세요.');
  const {access_token} = await tokenResponse.json();
  const endDate = period === 'yesterday' ? 'yesterday' : 'today';
  const startDate = ranges[period] || ranges['30days'];
  const reports = [
    {dimensions:[{name:'date'}],metrics:[{name:'screenPageViews'}]},
    {dimensions:[{name:'sessionSourceMedium'}],metrics:[{name:'sessions'}]},
    {dimensions:[{name:'landingPagePlusQueryString'},{name:'sessionSourceMedium'}],metrics:[{name:'sessions'}]},
    {dimensions:[{name:'sessionManualTerm'},{name:'landingPagePlusQueryString'}],metrics:[{name:'sessions'}]}
  ];
  const result = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + PROPERTY + ':batchRunReports', {
    method:'POST', headers:{Authorization:'Bearer ' + access_token,'Content-Type':'application/json'},
    body:JSON.stringify({requests:reports.map(report => ({...report,dateRanges:[{startDate,endDate}],limit:1000}))})
  });
  if (!result.ok) throw Error('Google 방문 통계를 조회하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  const data = await result.json();
  return data.reports.map(report => (report.rows || []).map(row => ({
    dimensions:row.dimensionValues.map(value => value.value),
    value:Number(row.metricValues[0].value)
  })));
}
