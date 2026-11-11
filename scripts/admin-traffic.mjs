const channels = ['UTM 캠페인','유료 유입','자연 검색','AI 서비스','기타 외부','내부','출처 미확인'];
export function trafficReport(rows) {
  const days = new Map();
  for (const row of rows || []) {
    const [date, sourceRaw, mediumRaw, campaignRaw] = row.dimensions;
    const source = sourceRaw.toLowerCase(), medium = mediumRaw.toLowerCase(), campaign = campaignRaw.toLowerCase();
    let category;
    if (campaign && campaign !== '(not set)' && campaign !== '(organic)') category = 0;
    else if (/^(cpc|ppc|paid|paidsearch|display|cpm|paid_social)$/.test(medium)) category = 1;
    else if (/(^|\.)(chatgpt\.com|chat\.openai\.com|claude\.ai|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/.test(source)) category = 3;
    else if (medium === 'organic' || /(^|\.)search\.naver\.com$/.test(source) || source === 'm.search.naver.com') category = 2;
    else if (/(^|\.)tvut\.3678dairy\.com$/.test(source)) category = 5;
    else if (!source || source === '(direct)' || source === '(not set)' || source === '(none)') category = 6;
    else category = 4;
    if (!days.has(date)) days.set(date,Array(7).fill(0));
    days.get(date)[category] += row.value;
  }
  const totals = Array(7).fill(0);
  for (const values of days.values()) values.forEach((value,i) => totals[i] += value);
  return {channels,totals,days:[...days].sort((a,b)=>b[0].localeCompare(a[0])).map(([date,values])=>({date,values}))};
}
