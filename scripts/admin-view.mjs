import {trafficReport} from './admin-traffic.mjs';
const analytics = 'https://analytics.google.com/analytics/web/#/a383407073p562387220/reports/intelligenthome';
function escape(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function documentPage(title, body) {
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/tvut-admin.css"><title>' + title + ' · 티벗 관리자</title></head><body>' + body + '</body></html>';
}
export function loginPage(failed, changed = false) {
  return documentPage('로그인', `<main class="login"><section class="login-card"><div class="brand"><i aria-hidden="true">티</i>티벗 운영</div>
    <h1>관리자 로그인</h1>${changed ? '<p>비밀번호가 변경됐습니다. 새 비밀번호로 로그인해 주세요.</p>' : ''}<form action="/admin/login" method="post">
    <label for="username">아이디</label><input id="username" name="username" value="admin" autocomplete="username" required>
    <label for="password">비밀번호</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" maxlength="100" required autofocus><button class="password-toggle" type="button" aria-label="비밀번호 보기" aria-pressed="false" aria-controls="password" hidden><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
    ${failed ? '<p class="error" role="alert">아이디와 비밀번호를 확인해 주세요.</p>' : ''}
    <button class="primary">로그인</button><p class="save-hint">로그인 후 브라우저에서 비밀번호 저장을 선택하세요.</p></form><script src="/assets/tvut-admin-login.js" defer></script></section></main>`);
}
function workspace(title, content) {
  return documentPage(title, `<div class="workspace"><aside><div class="brand"><i aria-hidden="true">티</i>티벗 관리자</div><nav aria-label="관리 메뉴">
    <a href="/admin/" ${title === '대시보드' ? 'aria-current="page"' : ''}>대시보드</a><a href="/admin/posts" ${title === '게시글' ? 'aria-current="page"' : ''}>게시글</a>
    <a href="/admin/analytics" ${title === '방문 통계' ? 'aria-current="page"' : ''}>방문 통계</a><a href="/admin/seo" ${title === 'SEO 진단' ? 'aria-current="page"' : ''}>SEO 진단</a><a href="/admin/indexnow" ${title === 'IndexNow' ? 'aria-current="page"' : ''}>IndexNow</a><a href="/admin/password" ${title === '비밀번호 변경' ? 'aria-current="page"' : ''}>비밀번호 변경</a></nav></aside><div><header><span>티벗 사이트 관리</span><div>
    <a href="/" target="_blank" rel="noopener">사이트 보기 ↗</a><form method="post" action="/admin/logout"><button>로그아웃</button></form></div></header>
    <main class="content"><h1>${title}</h1>${content}</main></div></div>`);
}
export function passwordPage(error = '') {
  return workspace('비밀번호 변경', `<section class="panel password-settings"><form action="/admin/password" method="post">
  <label for="current">현재 비밀번호</label><input id="current" name="current" type="password" autocomplete="current-password" required>
  <label for="next">새 비밀번호</label><input id="next" name="next" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
  <label for="confirm">새 비밀번호 확인</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="128" required>
  <p>새 비밀번호는 12자 이상 입력해 주세요. 변경 후 다시 로그인합니다.</p>
  ${error ? `<p class="password-error" role="alert">${escape(error)}</p>` : ''}<button class="primary">비밀번호 변경</button></form></section>`);
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
export function postsPage(entries, search, articles=[]) {
  const term = search.trim().slice(0,150);
  const filtered = entries.filter(entry => [entry.program, entry.title, entry.url, entry.date].join(' ').toLowerCase().includes(term.toLowerCase()));
  const written = articles.map(row=>{const draft=JSON.parse(row.draft); return `<li><a href="/admin/article?slug=${encodeURIComponent(row.slug)}"><span><small>${row.published?'발행됨 · 수정 가능':'임시저장'}</small><strong>${escape(draft.title)}</strong></span><span>편집 →</span></a></li>`}).join('');
  return workspace('게시글', `<section class="panel"><div class="heading"><h2>관리자 작성 글</h2><a class="primary" href="/admin/article">새 글 작성</a></div>${written?'<ul class="entries">'+written+'</ul>':'<p>관리자에서 작성한 글이 없습니다.</p>'}</section><section class="panel"><form method="get" action="/admin/posts" class="search"><label for="q">기존 공개 페이지 검색</label><div>
    <input type="search" id="q" name="q" value="${escape(term)}" maxlength="150" placeholder="제목, 프로그램, 주소"><button class="primary">검색</button></div></form>
    <div class="heading"><h2>${term ? '검색 결과' : '공개 글'} ${filtered.length}개</h2>${term ? '<a href="/admin/posts">전체 보기</a>' : ''}</div>
    ${filtered.length ? '<ul class="entries static-entries">'+filtered.map(entry=>`<li><span><small>${escape(entry.program)} · ${entry.date?escape(entry.date):'프로그램 안내'}</small><strong>${escape(entry.title)}</strong></span><a href="/admin/static-edit?path=${encodeURIComponent(entry.url)}">편집 →</a></li>`).join('')+'</ul>' : '<p>일치하는 게시글이 없습니다.</p>'}<p>기존 페이지의 제목과 일반 문단을 수정할 수 있습니다. 광고·이미지·버튼·링크 등은 그대로 유지됩니다.</p></section>`);
}
export function staticEditor(path, parts, hash, row, error='') {
  const outdated = Boolean(row && row.source_hash !== hash);
  let values = parts.map(x=>x.text);
  if (row && !outdated) { try { const saved=JSON.parse(row.draft); if (Array.isArray(saved)&&saved.length===parts.length) values=saved; } catch {} }
  const inputs=parts.map((part,i)=>`<label for="field-${i}">${part.tag==='p'?'본문':part.tag==='h1'?'페이지 제목':'소제목'} ${i+1}</label><textarea id="field-${i}" name="field_${i}" rows="${part.tag==='p'?3:2}" maxlength="5000">${escape(values[i])}</textarea>`).join('');
  const buttons=row?`<div class="article-actions"><a href="/admin/static-preview?path=${encodeURIComponent(path)}" target="_blank" rel="noopener">저장된 수정본 미리보기 ↗</a>${outdated?'':`<form method="post" action="/admin/static-publish"><input type="hidden" name="path" value="${escape(path)}"><input type="hidden" name="version" value="${escape(row.version)}"><button class="primary">수정사항 발행</button></form>`}${row.published?`<form method="post" action="/admin/static-restore"><input type="hidden" name="path" value="${escape(path)}"><input type="hidden" name="version" value="${escape(row.version)}"><button>원본으로 복구</button></form>`:''}<a href="${escape(path)}" target="_blank" rel="noopener">공개 페이지 보기 ↗</a></div>`:'';
  return workspace('기존 게시글 편집',`<section class="panel"><h2>${escape(path)}</h2><p>일반 텍스트 제목·문단만 수정합니다. 광고, 이미지, 버튼, 링크와 중첩 서식은 편집하지 않고 원래대로 유지합니다. 검색 결과 제목·설명 등 메타정보는 자동 변경되지 않습니다.</p>${outdated?'<p class="error" role="alert">원본이 변경되어 기존 수정본을 표시하지 않습니다. 공개 수정본이 있으면 먼저 원본으로 복구한 뒤 다시 저장해 주세요.</p>':''}${error?'<p class="error" role="alert">'+escape(error)+'</p>':''}<form method="post" action="/admin/static-save" class="article-form"><input type="hidden" name="path" value="${escape(path)}"><input type="hidden" name="source_hash" value="${escape(hash)}"><input type="hidden" name="version" value="${escape(row?.version || '')}">${inputs}<button class="primary">수정본 임시저장</button></form>${buttons}</section>`);
}
export function articleEditor(row=null,error='',hasRevision=false,values=null) {
  const a = values || (row ? JSON.parse(row.draft) : {slug:'',title:'',description:'',body:''});
  return workspace(row?'게시글 편집':'새 글 작성', `<section class="panel"><form method="post" action="/admin/article-save" class="article-form"><input type="hidden" name="old_slug" value="${escape(row?.slug || '')}"><input type="hidden" name="version" value="${escape(row?.updated || '')}"><label for="slug">글 주소 (영문 소문자·숫자·하이픈)</label><input id="slug" name="slug" value="${escape(a.slug)}" maxlength="80" ${row?'readonly':''} required><label for="article-title">제목</label><input id="article-title" name="title" value="${escape(a.title)}" maxlength="150" required><label for="description">검색 설명</label><textarea id="description" name="description" maxlength="300" rows="3" required>${escape(a.description)}</textarea><label for="body">본문</label><textarea id="body" name="body" maxlength="50000" rows="18" required>${escape(a.body)}</textarea><p>빈 줄을 넣으면 문단이 구분됩니다. 글은 임시저장 후 미리보기에서 확인하고 발행합니다.</p>${error?'<p class="error">'+escape(error)+'</p>':''}<button class="primary">임시저장</button></form>${row?`<div class="article-actions"><a href="/admin/article-preview?slug=${encodeURIComponent(row.slug)}" target="_blank" rel="noopener">임시저장 글 미리보기 ↗</a><form method="post" action="/admin/article-publish"><input type="hidden" name="slug" value="${escape(row.slug)}"><input type="hidden" name="version" value="${escape(row.updated)}"><button class="primary">${row.published?'수정사항 발행':'발행하기'}</button></form>${row.published?`<a href="/review/notice/${encodeURIComponent(row.slug)}/" target="_blank" rel="noopener">공개 글 보기 ↗</a>`:''}${hasRevision?`<form method="post" action="/admin/article-restore"><input type="hidden" name="slug" value="${escape(row.slug)}"><input type="hidden" name="version" value="${escape(row.updated)}"><button>이전 발행본 복구</button></form>`:''}</div>`:''}</section>`);
}
function pageOptions(entries, selected) {
  const pages = [{url:'/',title:'티벗 메인페이지'},...entries.filter(e=>e.url !== '/')];
  return pages.map(e=>`<option value="${escape(e.url)}" ${e.url===selected?'selected':''}>${escape(e.title)} · ${escape(e.url)}</option>`).join('');
}
export function seoPage(entries, path='/', result=null, error='') {
  const item = (label, value, ok, detail='') => `<li><strong>${escape(label)}</strong><span class="seo-state ${ok?'ok':'attention'}">${ok?'확인':'확인 필요'}</span><div>${escape(value || '설정되지 않음')}</div>${detail?'<small>'+escape(detail)+'</small>':''}</li>`;
  return workspace('SEO 진단', `<section class="panel"><form method="get" action="/admin/seo" class="seo-form"><label for="seo-path">진단할 공개 페이지</label><select id="seo-path" name="path">${pageOptions(entries,path)}</select><button class="primary">진단하기</button></form><p>현재 공개된 HTML을 확인합니다. 검색엔진의 실제 수집·색인 여부나 robots.txt 전체 설정은 확인하지 않습니다.</p>${error?'<p class="error" role="alert">'+escape(error)+'</p>':''}${result?`<ul class="seo-list">${item('HTTP 응답',String(result.status),result.status===200,'200이 아닌 응답은 별도 확인이 필요합니다.')}${item('페이지 제목',result.title,Boolean(result.title))}${item('검색 설명',result.description,Boolean(result.description))}${item('대표 이미지 (og:image)',result.image,Boolean(result.image),'주소 유무만 확인하며 이미지 접근 가능 여부는 확인하지 않습니다.')}${item('대표 URL',result.canonical,Boolean(result.canonical) && result.canonicalMatches,'선택한 페이지의 주소와 일치하는지 확인합니다.')}${item('색인 제한 메타 / HTTP 헤더',[result.robots,result.robotsHeader].filter(Boolean).join(' / ') || 'noindex 미발견',!result.hasNoindex,'일반 robots 메타와 X-Robots-Tag만 확인합니다.')}</ul>`:''}</section>`);
}
export function indexNowPage(entries, path='/', result=null, error='') {
  let message = '';
  if (result !== null) {
    if (result === 200) message = '네이버가 요청을 정상 수신했습니다 (HTTP 200).';
    else if (result === 202) message = '네이버가 요청을 접수했으며 키 확인 중입니다 (HTTP 202).';
    else message = '요청에 실패했습니다 (HTTP '+result+'). 키, 주소 또는 네이버 서비스 상태를 확인해 주세요.';
  }
  return workspace('IndexNow', `<section class="panel"><p>신규 또는 변경된 공개 페이지를 네이버에 알립니다. 참여 검색엔진에 공유될 수 있으며 검색 색인을 보장하지 않습니다.</p><form method="post" action="/admin/indexnow" class="seo-form"><label for="index-path">변경된 페이지</label><select id="index-path" name="path">${pageOptions(entries,path)}</select><button class="primary">변경 페이지 제출</button></form>${message?'<p role="status">'+escape(message)+'</p>':''}${error?'<p class="error" role="alert">'+escape(error)+'</p>':''}<p>동일 페이지를 변경 없이 반복 제출하지 마세요.</p></section>`);
}
export function analyticsPage(reports, selected, error='', search=null, searchError='', query='', naver=null) {
  const periods = {today:'오늘',yesterday:'어제','7days':'7일','14days':'14일','30days':'30일','60days':'60일','90days':'90일'};
  const buttons = Object.entries(periods).map(([key,label]) => `<a href="/admin/analytics?period=${key}" class="period ${selected===key?'active':''}">${label}</a>`).join('');
  if (!reports) return workspace('방문 통계', `<section class="panel"><p class="error">${escape(error)}</p></section>`);
  const [daily,sources,landing,terms] = reports;
  const filter = query.trim().slice(0,150);
  const filteredSearch = search?.filter(row => (row.term+' '+row.page).toLowerCase().includes(filter.toLowerCase()));
  const table = (rows, labels) => '<div class="table-wrap"><table><thead><tr>' + labels.map(label=>'<th>'+label+'</th>').join('') + '</tr></thead><tbody>' + rows.map(row=>'<tr>'+row.dimensions.map(value=>'<td>'+escape(value)+'</td>').join('')+'<td>'+row.value.toLocaleString('ko-KR')+'</td></tr>').join('')+'</tbody></table></div>';
  const views = daily.reduce((sum,row)=>sum+row.value,0);
  const traffic = trafficReport(reports[4]);
  const sessionTotal = traffic.totals.reduce((a,b)=>a+b,0);
  const unknown = traffic.totals[6];
  const external = traffic.totals.slice(0,5).reduce((a,b)=>a+b,0);
  const comparison = reports.previousViews == null ? '조회 불가' : reports.previousViews === 0 ? '비교 기준 없음' : ((views-reports.previousViews)/reports.previousViews*100).toFixed(1)+'%';
  const dayTable = '<div class="table-wrap"><table><thead><tr><th>날짜</th>'+traffic.channels.map(x=>'<th>'+escape(x)+'</th>').join('')+'<th>합계</th></tr></thead><tbody>'+traffic.days.map(row=>'<tr><td>'+escape(row.date)+'</td>'+row.values.map(x=>'<td>'+x.toLocaleString('ko-KR')+'</td>').join('')+'<td>'+row.values.reduce((a,b)=>a+b,0).toLocaleString('ko-KR')+'</td></tr>').join('')+'</tbody></table></div>';
  const naverTable = (items, heading) => '<h3>'+heading+'</h3>' + (items.length ? '<div class="table-wrap"><table><thead><tr><th>'+heading+'</th><th>클릭</th><th>노출</th></tr></thead><tbody>'+items.map(row=>'<tr><td>'+escape(row.name)+'</td><td>'+row.clicks.toLocaleString('ko-KR')+'</td><td>'+row.impressions.toLocaleString('ko-KR')+'</td></tr>').join('')+'</tbody></table></div>' : '<p>제공된 자료가 없습니다.</p>');
  const naverPanel = `<section class="panel"><h2>네이버 검색 실적</h2>${naver ? `<p>네이버 기준일 ${escape(naver.updated)} · 최근 ${escape(naver.days)}일 · 저장 ${escape(naver.saved)}</p>${naverTable(naver.keywords,'검색어')}${naverTable(naver.pages,'검색 페이지')}` : '<p>저장된 보고서가 없습니다.</p>'}<p>검색어와 페이지는 각각의 순위이며 둘 사이의 연결 관계를 뜻하지 않습니다. 상위 30개까지 제공됩니다.</p><p><a href="https://searchadvisor.naver.com/console/site/report/expose?site=https%3A%2F%2Ftvut.3678dairy.com" target="_blank" rel="noopener">네이버 원본 보고서 ↗</a></p><details><summary>보고서 자료 갱신</summary><form method="post" action="/admin/naver-report"><label for="naver-report">보고서 JSON</label><textarea id="naver-report" name="report" rows="8" maxlength="32000" required></textarea><p>네이버 보고서의 기준일, 기간, 검색어와 페이지 목록을 입력합니다.</p><button class="primary">보고서 저장</button></form></details></section>`;
  return workspace('방문 통계', `<div class="periods">${buttons}</div><section class="cards analytics-cards"><article><span>페이지 조회수</span><b>${views.toLocaleString('ko-KR')}</b></article><article><span>직전 동일 기간 대비</span><b>${escape(comparison)}</b><small>페이지 조회수 기준</small></article><article><span>확인 가능한 외부 유입</span><b>${external.toLocaleString('ko-KR')}</b><small>세션 기준</small></article><article><span>식별된 AI 서비스 유입</span><b>${traffic.totals[3].toLocaleString('ko-KR')}</b><small>세션 기준</small></article><article><span>출처 미확인 비율</span><b>${sessionTotal ? (unknown/sessionTotal*100).toFixed(1)+'%' : '—'}</b><small>세션 기준</small></article></section><div class="panels">
  <section class="panel"><h2>날짜별 조회수</h2>${barChart([...daily].sort((a,b)=>a.dimensions[0].localeCompare(b.dimensions[0])), '날짜별 페이지 조회수')}${table(daily.sort((a,b)=>b.dimensions[0].localeCompare(a.dimensions[0])),['날짜','조회수'])}</section>
  <section class="panel"><h2>유입 경로</h2>${barChart([...sources].sort((a,b)=>b.value-a.value).slice(0,10), '유입 경로별 세션')}${table(sources.sort((a,b)=>b.value-a.value),['출처 / 매체','세션'])}</section></div>
  <section class="panel"><h2>도착 페이지와 유입 경로</h2>${table(landing.sort((a,b)=>b.value-a.value),['도착 페이지','출처 / 매체','세션'])}</section>
  <section class="panel"><h2>날짜별 유입 경로</h2><p>GA4 세션 기준입니다. 분류 우선순위는 UTM 캠페인, 유료 유입, AI 서비스, 자연 검색, 내부, 기타 외부, 출처 미확인입니다. 출처가 전달되지 않은 방문은 직접 방문과 구분할 수 없습니다. AI 유입은 식별된 출처만 포함합니다.</p>${dayTable}</section>
  ${naverPanel}<section class="panel"><h2>캠페인 검색어와 도착 페이지</h2>${terms.filter(row=>row.dimensions[0] && row.dimensions[0]!=='(not set)').length ? table(terms.filter(row=>row.dimensions[0] && row.dimensions[0]!=='(not set)').sort((a,b)=>b.value-a.value),['캠페인 검색어','도착 페이지','세션']) : '<p>선택한 기간에 수집된 캠페인 검색어가 없습니다.</p>'}<p>UTM 캠페인에 입력된 검색어입니다.</p></section>
  <section class="panel"><h2>Google 자연검색어와 도착 페이지</h2><form method="get" action="/admin/analytics" class="search"><input type="hidden" name="period" value="${escape(periods[selected] ? selected : '30days')}"><label for="query">검색어 또는 페이지 찾기</label><div><input type="search" id="query" name="q" value="${escape(filter)}" maxlength="150" placeholder="검색어 또는 페이지 주소"><button class="primary">검색</button></div></form>${searchError ? '<p>'+escape(searchError)+'</p>' : search === null ? '<p>Google 검색 실적 연결이 필요합니다.</p>' : filteredSearch.length ? '<div class="table-wrap"><table><thead><tr><th>검색어</th><th>도착 페이지</th><th>클릭</th><th>노출</th></tr></thead><tbody>'+filteredSearch.map(row=>'<tr><td>'+escape(row.term)+'</td><td>'+escape(row.page)+'</td><td>'+Number(row.clicks).toLocaleString('ko-KR')+'</td><td>'+Number(row.impressions).toLocaleString('ko-KR')+'</td></tr>').join('')+'</tbody></table></div>' : '<p>선택한 기간과 검색 조건에 제공된 검색 실적이 없습니다.</p>'}<p>Google Search Console 자료는 미국 태평양 시간을 기준으로 하며 집계에 시간이 걸립니다. 일부 검색어가 제공되지 않을 수 있고, 네이버 검색어는 별도 자료가 필요합니다.</p></section>`);
}
