const analytics = 'https://analytics.google.com/analytics/web/#/a383407073p562387220/reports/intelligenthome';
function escape(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function documentPage(title, body) {
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/tvut-admin.css"><title>' + title + ' · 티벗 관리자</title></head><body>' + body + '</body></html>';
}
export function loginPage(failed) {
  return documentPage('로그인', `<main class="login"><section class="login-card"><div class="brand"><i aria-hidden="true">티</i>티벗 운영</div>
    <h1>관리자 로그인</h1><form action="/admin/login" method="post">
    <label for="username">아이디</label><input id="username" name="username" value="admin" autocomplete="username" required>
    <label for="password">비밀번호</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" maxlength="100" required autofocus><button class="password-toggle" type="button" aria-label="비밀번호 보기" aria-pressed="false" aria-controls="password" hidden><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
    ${failed ? '<p class="error" role="alert">아이디와 비밀번호를 확인해 주세요.</p>' : ''}
    <button class="primary">로그인</button><p class="save-hint">로그인 후 브라우저에서 비밀번호 저장을 선택하세요.</p></form><script src="/assets/tvut-admin-login.js" defer></script></section></main>`);
}
function workspace(title, content) {
  return documentPage(title, `<div class="workspace"><aside><div class="brand"><i aria-hidden="true">티</i>티벗 관리자</div><nav aria-label="관리 메뉴">
    <a href="/admin/" ${title === '대시보드' ? 'aria-current="page"' : ''}>대시보드</a><a href="/admin/posts" ${title === '게시글' ? 'aria-current="page"' : ''}>게시글</a>
    <a href="/admin/analytics" ${title === '방문 통계' ? 'aria-current="page"' : ''}>방문 통계</a></nav></aside><div><header><span>티벗 사이트 관리</span><div>
    <a href="/" target="_blank" rel="noopener">사이트 보기 ↗</a><form method="post" action="/admin/logout"><button>로그아웃</button></form></div></header>
    <main class="content"><h1>${title}</h1>${content}</main></div></div>`);
}
function rows(entries) {
  return '<ul class="entries">' + entries.map(entry => `<li><a href="${escape(entry.url)}" target="_blank" rel="noopener"><span><small>${escape(entry.program)} · ${entry.date ? escape(entry.date) : '프로그램 안내'}</small><strong>${escape(entry.title)}</strong></span><span aria-hidden="true">↗</span></a></li>`).join('') + '</ul>';
}
function barChart(rows, label) {
  if (!rows.length) return '<p>해당 기간의 자료가 없습니다.</p>';
  const values = rows;
  const max = Math.max(...values.map(row => row.value), 1);
  const width = Math.max(values.length * 22, 220);
  const bars = values.map((row, index) => {
    const height = Math.max(2, Math.round(row.value / max * 130));
    const text = escape(row.dimensions[0]) + ' · ' + row.value.toLocaleString('ko-KR');
    return `<rect x="${index * 22 + 5}" y="${140-height}" width="14" height="${height}" rx="3"><title>${text}</title></rect>`;
  }).join('');
  return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${width} 150" role="img" aria-label="${escape(label)}">${bars}</svg></div>`;
}
export function dashboardPage(entries, reports = null) {
  const reviews = entries.filter(entry => entry.date).sort((a,b) => b.date.localeCompare(a.date));
  const guides = entries.filter(entry => !entry.date);
  return workspace('대시보드', `<section class="cards" aria-label="콘텐츠 현황">
    <article><span>전체 게시글</span><b>${entries.length}</b></article><article><span>프로그램 안내</span><b>${guides.length}</b></article><article><span>방송 글</span><b>${reviews.length}</b></article></section>
    ${reports ? `<section class="panel overview-chart"><div class="heading"><h2>최근 30일 페이지 조회수</h2><a href="/admin/analytics">통계 보기 →</a></div>${barChart([...reports[0]].sort((a,b)=>a.dimensions[0].localeCompare(b.dimensions[0])), '최근 30일 날짜별 페이지 조회수')}</section>` : ''}
    <div class="panels"><section class="panel"><div class="heading"><h2>최근 방송 글</h2><a href="/admin/posts">전체 보기 →</a></div>${rows(reviews.slice(0,5))}</section>
    <section class="panel"><h2>프로그램 안내</h2>${rows(guides)}</section></div>`);
}
export function postsPage(entries, search) {
  const term = search.trim().slice(0,150);
  const filtered = entries.filter(entry => [entry.program, entry.title, entry.url, entry.date].join(' ').toLowerCase().includes(term.toLowerCase()));
  return workspace('게시글', `<section class="panel"><form method="get" action="/admin/posts" class="search"><label for="q">게시글 검색</label><div>
    <input type="search" id="q" name="q" value="${escape(term)}" maxlength="150" placeholder="제목, 프로그램, 주소"><button class="primary">검색</button></div></form>
    <div class="heading"><h2>${term ? '검색 결과' : '공개 글'} ${filtered.length}개</h2>${term ? '<a href="/admin/posts">전체 보기</a>' : ''}</div>
    ${filtered.length ? rows(filtered) : '<p>일치하는 게시글이 없습니다.</p>'}</section>`);
}
export function analyticsPage(reports, selected, error='') {
  const periods = {today:'오늘',yesterday:'어제','7days':'7일','14days':'14일','30days':'30일','60days':'60일','90days':'90일'};
  const buttons = Object.entries(periods).map(([key,label]) => `<a href="/admin/analytics?period=${key}" class="period ${selected===key?'active':''}">${label}</a>`).join('');
  if (!reports) return workspace('방문 통계', `<section class="panel"><p class="error">${escape(error)}</p></section>`);
  const [daily,sources,landing,terms] = reports;
  const table = (rows, labels) => '<div class="table-wrap"><table><thead><tr>' + labels.map(label=>'<th>'+label+'</th>').join('') + '</tr></thead><tbody>' + rows.map(row=>'<tr>'+row.dimensions.map(value=>'<td>'+escape(value)+'</td>').join('')+'<td>'+row.value.toLocaleString('ko-KR')+'</td></tr>').join('')+'</tbody></table></div>';
  const views = daily.reduce((sum,row)=>sum+row.value,0);
  return workspace('방문 통계', `<div class="periods">${buttons}</div><section class="cards"><article><span>페이지 조회수</span><b>${views.toLocaleString('ko-KR')}</b></article></section><div class="panels">
  <section class="panel"><h2>날짜별 조회수</h2>${barChart([...daily].sort((a,b)=>a.dimensions[0].localeCompare(b.dimensions[0])), '날짜별 페이지 조회수')}${table(daily.sort((a,b)=>b.dimensions[0].localeCompare(a.dimensions[0])),['날짜','조회수'])}</section>
  <section class="panel"><h2>유입 경로</h2>${barChart([...sources].sort((a,b)=>b.value-a.value).slice(0,10), '유입 경로별 세션')}${table(sources.sort((a,b)=>b.value-a.value),['출처 / 매체','세션'])}</section></div>
  <section class="panel"><h2>도착 페이지와 유입 경로</h2>${table(landing.sort((a,b)=>b.value-a.value),['도착 페이지','출처 / 매체','세션'])}</section>
  <section class="panel"><h2>캠페인 검색어와 도착 페이지</h2>${terms.filter(row=>row.dimensions[0] && row.dimensions[0]!=='(not set)').length ? table(terms.filter(row=>row.dimensions[0] && row.dimensions[0]!=='(not set)').sort((a,b)=>b.value-a.value),['캠페인 검색어','도착 페이지','세션']) : '<p>선택한 기간에 수집된 캠페인 검색어가 없습니다.</p>'}<p>UTM 캠페인에 입력된 검색어입니다. 자연검색 검색어는 Google Search Console 또는 네이버 서치어드바이저 자료가 필요합니다.</p></section>`);
}
