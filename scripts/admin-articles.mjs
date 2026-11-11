const base = 'https://tvut.3678dairy.com';
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function articleData(form) {
  const slug = (form.get('slug') || '').trim();
  const title = (form.get('title') || '').trim();
  const description = (form.get('description') || '').trim();
  const body = (form.get('body') || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) throw Error('주소는 영문 소문자, 숫자, 하이픈으로 입력해 주세요.');
  if (!title || title.length > 150 || !description || description.length > 300 || !body || body.length > 50000) throw Error('제목, 검색 설명과 본문을 입력해 주세요.');
  return {slug,title,description,body};
}
export async function ensureArticles(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_articles (slug TEXT PRIMARY KEY, draft TEXT NOT NULL, published TEXT, updated TEXT NOT NULL, published_at TEXT)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_article_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, content TEXT NOT NULL, saved_at TEXT NOT NULL)').run();
}
export async function articleList(db) {
  await ensureArticles(db);
  return (await db.prepare('SELECT slug,draft,published,updated,published_at FROM admin_articles ORDER BY updated DESC').all()).results;
}
export async function publishedArticles(db) {
  await ensureArticles(db);
  return (await db.prepare('SELECT slug,published,published_at FROM admin_articles WHERE published IS NOT NULL ORDER BY published_at DESC LIMIT 500').all()).results;
}
export async function articleGet(db, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '') || slug.length > 80) return null;
  await ensureArticles(db);
  return db.prepare('SELECT slug,draft,published,updated,published_at FROM admin_articles WHERE slug=?').bind(slug).first();
}
export async function articleSave(db, form) {
  const data = articleData(form), oldSlug = form.get('old_slug') || '';
  if (oldSlug && oldSlug !== data.slug) throw Error('기존 글의 주소는 변경할 수 없습니다.');
  await ensureArticles(db);
  const old = await articleGet(db,data.slug);
  if (old && !oldSlug) throw Error('이미 사용 중인 글 주소입니다.');
  if (oldSlug && !old) throw Error('수정할 글을 찾을 수 없습니다.');
  if (old && form.get('version') !== old.updated) throw Error('다른 곳에서 글이 변경되었습니다. 다시 불러온 뒤 수정해 주세요.');
  const time = new Date().toISOString() + '-' + crypto.randomUUID();
  if (old) {
    const result = await db.prepare('UPDATE admin_articles SET draft=?,updated=? WHERE slug=? AND updated=?').bind(JSON.stringify(data),time,data.slug,old.updated).run();
    if (result.meta.changes !== 1) throw Error('다른 곳에서 글이 변경되었습니다. 다시 불러온 뒤 수정해 주세요.');
  } else {
    await db.prepare('INSERT INTO admin_articles(slug,draft,updated) VALUES(?,?,?)').bind(data.slug,JSON.stringify(data),time).run();
  }
  return data.slug;
}
export async function articlePublish(db, slug, version) {
  const old = await articleGet(db,slug);
  if (!old || old.updated !== version) throw Error('글이 변경되었습니다. 다시 확인한 뒤 발행해 주세요.');
  const time = new Date().toISOString();
  const [,result] = await db.batch([
    db.prepare('INSERT INTO admin_article_revisions(slug,content,saved_at) SELECT slug,published,? FROM admin_articles WHERE slug=? AND updated=? AND published IS NOT NULL').bind(time,slug,version),
    db.prepare('UPDATE admin_articles SET published=draft,published_at=? WHERE slug=? AND updated=?').bind(time,slug,version)
  ]);
  if (result.meta.changes !== 1) throw Error('글이 변경되었습니다. 다시 확인한 뒤 발행해 주세요.');
}
export async function articleRestore(db,slug,version) {
  const old = await articleGet(db,slug);
  if (!old || old.updated !== version || !old.published) throw Error('글이 변경되었습니다. 다시 확인해 주세요.');
  const revision = await db.prepare('SELECT id,content FROM admin_article_revisions WHERE slug=? ORDER BY id DESC LIMIT 1').bind(slug).first();
  if (!revision) throw Error('복구할 이전 발행본이 없습니다.');
  const time = new Date().toISOString();
  const [,result] = await db.batch([
    db.prepare('INSERT INTO admin_article_revisions(slug,content,saved_at) SELECT slug,published,? FROM admin_articles WHERE slug=? AND updated=? AND published IS NOT NULL').bind(time,slug,version),
    db.prepare('UPDATE admin_articles SET published=?,published_at=? WHERE slug=? AND updated=?').bind(revision.content,time,slug,version)
  ]);
  if (result.meta.changes !== 1) throw Error('글이 변경되었습니다. 다시 확인해 주세요.');
}
export async function articleHasRevision(db,slug) {
  return Boolean(await db.prepare('SELECT id FROM admin_article_revisions WHERE slug=? LIMIT 1').bind(slug).first());
}
export function renderArticle(data, preview = false) {
  const paras = data.body.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(x=>'<p>'+escape(x).replace(/\n/g,'<br>')+'</p>').join('');
  const url = base+'/review/notice/'+encodeURIComponent(data.slug)+'/';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${preview?'noindex,nofollow':'index,follow'}"><title>${escape(data.title)}</title><meta name="description" content="${escape(data.description)}"><meta property="og:title" content="${escape(data.title)}"><meta property="og:description" content="${escape(data.description)}"><meta property="og:image" content="${base}/assets/tvut-main-square-v2.jpg"><meta property="og:url" content="${escape(url)}"><link rel="canonical" href="${escape(url)}"><link rel="stylesheet" href="/review.css">${preview?'':'<script defer src="/assets/site-analytics.js?v=2"></script>'}</head><body><header class="review-header"><div class="review-wrap review-header-inner"><a class="review-brand" href="/">티벗 퀴즈 안내</a><nav class="review-nav"><a href="/review/">전체 리뷰</a></nav></div></header><main class="review-main review-wrap"><article class="review-article">${preview?'<p>관리자 미리보기 · 공개되지 않은 내용이 포함될 수 있습니다.</p>':''}<h1>${escape(data.title)}</h1>${paras}<div class="review-actions"><a class="review-button" href="/">티벗 설치·가입 안내</a></div></article></main><footer class="review-footer"><div class="review-wrap"><a href="/">티벗 안내로 돌아가기</a></div></footer></body></html>`;
}
export function renderArticleIndex(rows) {
  const items = rows.map(row=>{const a=JSON.parse(row.published);return `<li><a href="/review/notice/${escape(encodeURIComponent(row.slug))}/"><strong>${escape(a.title)}</strong></a><p>${escape(a.description)}</p></li>`}).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>최신 티벗 안내 글</title><meta name="description" content="티벗과 방송 참여에 관한 최신 안내 글을 확인하세요."><link rel="canonical" href="${base}/review/notice/"><link rel="stylesheet" href="/review.css"><script defer src="/assets/site-analytics.js?v=2"></script></head><body><header class="review-header"><div class="review-wrap review-header-inner"><a class="review-brand" href="/">티벗 퀴즈 안내</a></div></header><main class="review-main review-wrap"><article class="review-article"><h1>최신 티벗 안내 글</h1>${items?'<ul>'+items+'</ul>':'<p>아직 작성된 글이 없습니다.</p>'}<a href="/review/">전체 방송 안내</a></article></main></body></html>`;
}
