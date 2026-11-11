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
    <label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="100" required autofocus>
    ${failed ? '<p class="error" role="alert">아이디와 비밀번호를 확인해 주세요.</p>' : ''}
    <button class="primary">로그인</button></form></section></main>`);
}
function workspace(title, content) {
  return documentPage(title, `<div class="workspace"><aside><div class="brand"><i aria-hidden="true">티</i>티벗 관리자</div><nav aria-label="관리 메뉴">
    <a href="/admin/" ${title === '대시보드' ? 'aria-current="page"' : ''}>대시보드</a><a href="/admin/posts" ${title === '게시글' ? 'aria-current="page"' : ''}>게시글</a>
    <a href="${analytics}" target="_blank" rel="noopener noreferrer">방문 통계 ↗</a></nav></aside><div><header><span>티벗 사이트 관리</span><div>
    <a href="/" target="_blank" rel="noopener">사이트 보기 ↗</a><form method="post" action="/admin/logout"><button>로그아웃</button></form></div></header>
    <main class="content"><h1>${title}</h1>${content}</main></div></div>`);
}
function rows(entries) {
  return '<ul class="entries">' + entries.map(entry => `<li><a href="${escape(entry.url)}" target="_blank" rel="noopener"><span><small>${escape(entry.program)} · ${entry.date ? escape(entry.date) : '프로그램 안내'}</small><strong>${escape(entry.title)}</strong></span><span aria-hidden="true">↗</span></a></li>`).join('') + '</ul>';
}
export function dashboardPage(entries) {
  const reviews = entries.filter(entry => entry.date).sort((a,b) => b.date.localeCompare(a.date));
  const guides = entries.filter(entry => !entry.date);
  return workspace('대시보드', `<section class="cards" aria-label="콘텐츠 현황">
    <article><span>전체 게시글</span><b>${entries.length}</b></article><article><span>프로그램 안내</span><b>${guides.length}</b></article><article><span>방송 글</span><b>${reviews.length}</b></article></section>
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
