const base = 'https://tvut.3678dairy.com';
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isCover = value => /^\/assets\/article-covers\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/.test(value || '') || /^\/media\/article\/[0-9a-f-]{36}$/.test(value || '');

export function articleData(form) {
  const slug = (form.get('slug') || '').trim();
  const title = (form.get('title') || '').trim();
  const description = (form.get('description') || '').trim();
  const body = (form.get('body') || '').trim();
  const summary = (form.get('summary') || '').trim(), buttonLabel = (form.get('button_label') || '').trim(), buttonUrl = (form.get('button_url') || '').trim();
  const thumbnail = (form.get('thumbnail') || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) throw Error('주소는 영문 소문자, 숫자, 하이픈으로 입력해 주세요.');
  if (!title || title.length > 150 || !description || description.length > 300 || !body || body.length > 50000) throw Error('제목, 검색 설명과 본문을 입력해 주세요.');
  if (summary.length > 3000 || buttonLabel.length > 80 || buttonUrl.length > 2048 || Boolean(buttonLabel) !== Boolean(buttonUrl)) throw Error('요약 또는 버튼을 확인해 주세요.');
  if (buttonUrl && !(buttonUrl.startsWith('/') && !buttonUrl.startsWith('//')) && !/^https:\/\//i.test(buttonUrl)) throw Error('버튼에는 사이트 내 경로 또는 HTTPS 주소를 사용해 주세요.');
  if (buttonUrl && /[\s\\\u0000-\u001f]/.test(buttonUrl)) throw Error('버튼 주소를 확인해 주세요.');
  if (thumbnail && !isCover(thumbnail)) throw Error('대표 이미지 주소를 확인해 주세요.');
  return {slug,title,description,body,summary,buttonLabel,buttonUrl,thumbnail,layoutVersion:3};
}
function inlineText(text) {
  return escape(text).replace(/\[버튼:([^\]\n]+)\]\((https:\/\/[^\s)\\]+|\/(?!\/)[^\s)\\]*)\)/g, '<a class="article-inline-button" href="$2" rel="noopener noreferrer">$1</a>').replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)\\]+|\/(?!\/)[^\s)\\]*)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
}
export function renderBody(body, button='') {
  let result='', paragraph=[], list=null, inserted=false;
  const flushParagraph=()=>{if(paragraph.length){result+='<p>'+paragraph.map(inlineText).join('<br>')+'</p>';paragraph=[];}};
  const closeList=()=>{if(list){result+='</'+list+'>';list=null;}};
  for(const line of body.replace(/\r\n?/g,'\n').split('\n')) {
    if(!line.trim()){flushParagraph();closeList();continue;}
    const heading=/^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if(heading){flushParagraph();closeList();if(!inserted && heading[1]==='##'){result+=button;inserted=true;}const tag=heading[1].length===2?'h2':'h3';result+='<'+tag+'>'+inlineText(heading[2])+'</'+tag+'>';continue;}
    const item=/^\s*(?:([-*])\s+|(\d+)\.\s+)(.+)$/.exec(line);
    if(item){flushParagraph();const tag=item[1]?'ul':'ol';if(list!==tag){closeList();list=tag;result+='<'+tag+'>';}result+='<li>'+inlineText(item[3])+'</li>';continue;}
    closeList();paragraph.push(line);
  }
  flushParagraph();closeList();return result+(inserted?'':button);
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
  const blocks=data.body.replace(/^(##\s+[^\n]+)\n(?!\n)/gm,'$1\n\n').split(/\n\s*\n|\n(?=##\s)/).map(x=>x.trim()).filter(Boolean);
  const button = data.buttonLabel && data.buttonUrl ? '<p class="life-cta"><a href="'+escape(data.buttonUrl)+'">'+escape(data.buttonLabel)+'</a></p>' : '';
  let inserted=false;
  const paras = data.layoutVersion===3 ? renderBody(data.body,button) : data.layoutVersion===2 ? blocks.map((x,i)=>{const heading=/^##\s+(.+)$/.exec(x);if(heading){const prefix=!inserted?(inserted=true,button):'';return prefix+'<h2>'+escape(heading[1])+'</h2>';}return '<p>'+escape(x).replace(/\n/g,'<br>')+'</p>';}).join('')+(inserted?'':button) : blocks.map(x=>'<p>'+escape(x).replace(/\n/g,'<br>')+'</p>').join('');
  const summary=data.layoutVersion>=2 && data.summary ? '<aside class="life-summary"><strong>이 글 요약 정리</strong><ul>'+data.summary.split(/\n/).filter(Boolean).map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul></aside>' : '';
  const thumbnail=isCover(data.thumbnail) ? data.thumbnail : '';
  const imageSrc=preview && thumbnail.startsWith('/media/article/') ? '/admin/article-image?id='+encodeURIComponent(thumbnail.split('/').pop()) : thumbnail;
  const cover=thumbnail ? '<figure class="review-cover article-cover"><img src="'+escape(imageSrc)+'" alt="'+escape(data.title)+' 안내용 이미지" width="1672" height="941" decoding="async">'+(data.layoutVersion===3?'':'<figcaption>이해를 돕기 위한 AI 생성 이미지</figcaption>')+'</figure>' : '';
  const url = base+'/review/notice/'+encodeURIComponent(data.slug)+'/';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${preview?'noindex,nofollow':'index,follow'}"><title>${escape(data.title)}</title><meta name="description" content="${escape(data.description)}"><meta property="og:title" content="${escape(data.title)}"><meta property="og:description" content="${escape(data.description)}"><meta property="og:image" content="${base}${escape(thumbnail || '/assets/tvut-main-square-v2.jpg')}"><meta property="og:url" content="${escape(url)}"><link rel="canonical" href="${escape(url)}"><link rel="stylesheet" href="/review.css">${data.layoutVersion>=2?'<link rel="stylesheet" href="/assets/life-article.css?v=2">':''}${preview?'':'<script defer src="/assets/site-analytics.js?v=2"></script>'}</head><body><header class="review-header"><div class="review-wrap review-header-inner"><a class="review-brand" href="/">티벗 퀴즈 안내</a><nav class="review-nav"><a href="/review/">전체 리뷰</a></nav></div></header><main class="review-main review-wrap"><article class="review-article${data.layoutVersion>=2?' life-article':''}${data.slug==='tvut-app-install-guide'?' article-animated-actions':''}">${preview?'<p>관리자 미리보기 · 공개되지 않은 내용이 포함될 수 있습니다.</p>':''}<h1>${escape(data.title)}</h1>${cover}${summary}${paras}${data.layoutVersion>=2?'':'<div class="review-actions"><a class="review-button" href="/">티벗 설치·가입 안내</a></div>'}</article></main><footer class="review-footer"><div class="review-wrap"><a href="/">티벗 안내로 돌아가기</a></div></footer></body></html>`;
}
const articleCategories = [
  {id:'tvut',label:'티벗 설치·이용'}, {id:'amplaza',label:'아침마당'},
  {id:'reallive',label:'2TV 생생정보'}, {id:'whatever',label:'무엇이든 물어보세요'},
  {id:'sixhour',label:'6시 내고향'}
];
function articleCategory(article,slug) {
  const text = `${article.title || ''} ${slug || ''}`.toLowerCase();
  if (/아침\s*마당|amplaza/.test(text)) return 'amplaza';
  if (/생생\s*정보|reallive/.test(text)) return 'reallive';
  if (/무엇이든\s*물어보세요|whatever/.test(text)) return 'whatever';
  if (/6\s*시\s*내\s*고향|sixhour|six-hour/.test(text)) return 'sixhour';
  if (/티벗|tvut/.test(text)) return 'tvut';
  return 'other';
}
export function renderArticleIndex(rows, requestedCategory = '') {
  const category = articleCategories.some(c=>c.id===requestedCategory) ? requestedCategory : '';
  const selected = articleCategories.find(c=>c.id===category);
  const tabs = [{id:'',label:'전체'},...articleCategories].map(c=>`<a href="/review/notice/${c.id?'?category='+c.id:''}"${c.id===category?' aria-current="page"':''}>${escape(c.label)}</a>`).join('');
  const articles = rows.flatMap(row=>{try{const article=JSON.parse(row.published);return [{...row,article}];}catch{return [];}});
  const filtered = category ? articles.filter(row=>articleCategory(row.article,row.slug)===category) : articles;
  const items = filtered.map(row=>`<li><a href="/review/notice/${escape(encodeURIComponent(row.slug))}/"><strong>${escape(row.article.title)}</strong><span>${escape(row.article.description)}</span><small>글 읽기 →</small></a></li>`).join('');
  const title = selected ? selected.label+' 정보 글' : '최신 티벗·방송 정보 글';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | 티벗 퀴즈 안내</title><meta name="description" content="티벗과 방송 참여에 관한 최신 안내 글을 확인하세요."><link rel="canonical" href="${base}/review/notice/"><link rel="stylesheet" href="/review.css?v=article-categories-v1"><script defer src="/assets/site-analytics.js?v=2"></script></head><body><header class="review-header"><div class="review-wrap review-header-inner"><a class="review-brand" href="/">티벗 퀴즈 안내</a><nav class="review-nav" aria-label="안내 메뉴"><a href="/">티벗 설치·참여</a><a href="/review/">방송 리뷰</a></nav></div></header><main class="review-main review-wrap"><article class="review-article article-index"><p class="eyebrow">티벗과 방송 이야기</p><h1>${escape(title)}</h1><p class="article-index-intro">궁금한 주제를 선택해 발행된 정보 글을 확인하세요.</p><nav class="article-index-tabs" aria-label="정보 글 카테고리">${tabs}</nav>${items?'<ul class="article-index-list">'+items+'</ul>':'<p class="article-index-empty">'+(category?'이 카테고리에 발행된 글이 아직 없습니다.':'아직 발행된 글이 없습니다.')+'</p>'}<div class="review-actions"><a class="review-button" href="/">티벗 설치·퀴즈 참여 안내</a><a class="review-button secondary" href="/review/">방송 리뷰 허브</a></div></article></main></body></html>`;
}
