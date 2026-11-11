import credential from './credential.json';
import entries from './catalog.json';
import {loginPage, dashboardPage, postsPage, analyticsPage, passwordPage, seoPage, indexNowPage, articleEditor, staticEditor, inflowsPage, writingGuidePage} from '../../scripts/admin-view.mjs';
import {defaultGuide} from '../../scripts/admin-writing-guide.mjs';
import {fetchAnalytics} from '../../scripts/admin-analytics.mjs';
import {fetchSearch} from '../../scripts/admin-search.mjs';
import {saveNaverReport, readNaverReport} from '../../scripts/admin-naver.mjs';
import {allowedPath, diagnose, submitIndexNow} from '../../scripts/admin-seo.mjs';
import {articleList, articleGet, articleSave, articlePublish, articleRestore, articleHasRevision, renderArticle} from '../../scripts/admin-articles.mjs';
import {permitted,originalPage,fields,fingerprint,getStatic,saveStatic,publishStatic,restoreStatic,applyChanges} from '../../scripts/admin-static-editor.mjs';
import {fetchRealtime} from '../../scripts/admin-realtime.mjs';
import {readSources,isAllowedSource} from '../../scripts/realtime-sources.mjs';
import {readEvents} from '../../scripts/inflow-events.mjs';

const origin = 'https://tvut.3678dairy.com';
const cookieName = '__Host-tvut_admin';
const lifetime = 3600;
const encoder = new TextEncoder();
const algorithm = {name: 'ECDSA', namedCurve: 'P-256'};
const signature = {name: 'ECDSA', hash: 'SHA-256'};
const keyUsage = encoder.encode('tvut/admin/signing-key/v1');

function decode(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
}
function encode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function publicKey(record) {
  return crypto.subtle.importKey('jwk', record.data.publicKey, algorithm, false, ['verify']);
}
async function currentCredential(env) {
  if (!env?.TVUT_ADMIN_DB) throw Error('관리자 인증 저장소에 연결할 수 없습니다.');
  const row = await env.TVUT_ADMIN_DB.prepare('SELECT credential, version FROM admin_auth WHERE id = 1').first();
  return row ? {data:JSON.parse(row.credential),version:row.version} : {data:credential,version:0};
}
async function wrappingKey(password, data, usages) {
  if (data.salt) {
    const base = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:decode(data.salt),iterations:100000},base,{name:'AES-GCM',length:256},false,usages);
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(password)) throw Error('비밀번호 오류');
  return crypto.subtle.importKey('raw',decode(password),'AES-GCM',false,usages);
}
async function unlock(password, data, extractable = false) {
  const key = await wrappingKey(password,data,['unwrapKey']);
  return crypto.subtle.unwrapKey('pkcs8',decode(data.wrappedKey),key,
    {name:'AES-GCM',iv:decode(data.iv),additionalData:keyUsage},algorithm,extractable,['sign']);
}
async function newSession(password, record) {
  try {
    const privateKey = await unlock(password,record.data);
    const now = Math.floor(Date.now() / 1000);
    const claims = encode(encoder.encode(JSON.stringify({sub:'admin', aud:origin, iat:now, exp:now + lifetime, ver:record.version, jti:crypto.randomUUID()})));
    return claims + '.' + encode(await crypto.subtle.sign(signature, privateKey, encoder.encode(claims)));
  } catch { return null; }
}
async function signedIn(request, record) {
  const cookie = (request.headers.get('Cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='));
  if (!cookie || cookie.length > 1024) return false;
  try {
    const parts = cookie.slice(cookieName.length + 1).split('.');
    if (parts.length !== 2) return false;
    const [payload, proof] = parts;
    if (!await crypto.subtle.verify(signature, await publicKey(record), decode(proof), encoder.encode(payload))) return false;
    const claims = JSON.parse(new TextDecoder().decode(decode(payload)));
    const now = Math.floor(Date.now() / 1000);
    return claims.sub === 'admin' && claims.aud === origin && (claims.ver ?? 0) === record.version && Number.isSafeInteger(claims.iat) &&
      claims.iat <= now && claims.exp === claims.iat + lifetime && claims.exp > now;
  } catch { return false; }
}
function respond(body, status = 200, extra = {}) {
  return new Response(body, {status, headers:{
    'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'private, no-store',
    'X-Robots-Tag':'noindex, nofollow, noarchive', 'Referrer-Policy':'same-origin',
    'X-Frame-Options':'DENY', 'X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extra
  }});
}
function jsonRespond(data,status=200) {
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
}
function redirect(location, cookie) {
  return respond(null, 303, cookie ? {Location:location, 'Set-Cookie':cookie} : {Location:location});
}
function sessionCookie(value, age) {
  return cookieName + '=' + value + '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=' + age;
}
async function searchableEntries(env) {
  const articles = await articleList(env.TVUT_ADMIN_DB);
  return [...entries,...articles.filter(row=>row.published).map(row=>({url:'/review/notice/'+row.slug+'/',title:JSON.parse(row.published).title,program:'관리자 작성',date:''}))];
}
async function getWritingGuide(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_writing_guide (id INTEGER PRIMARY KEY, guide TEXT NOT NULL, updated TEXT NOT NULL)').run();
  return (await db.prepare('SELECT guide,updated FROM admin_writing_guide WHERE id=1').first()) || {guide:defaultGuide,updated:''};
}
async function loginForm(request, limit = 1024) {
  const reader = request.body?.getReader();
  if (!reader) return new URLSearchParams();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) return new URLSearchParams(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, {stream:true});
    }
  } finally { reader.releaseLock(); }
}
async function changePassword(env, record, form) {
  const current = form.get('current') || '';
  const next = form.get('next') || '';
  const confirm = form.get('confirm') || '';
  if (next.length < 12 || next.length > 128 || !next.trim()) return '새 비밀번호는 12자 이상 128자 이하로 입력해 주세요.';
  if (next !== confirm) return '새 비밀번호가 일치하지 않습니다.';
  if (current === next) return '기존과 다른 비밀번호를 입력해 주세요.';
  try { await unlock(current,record.data); }
  catch { return '현재 비밀번호를 확인해 주세요.'; }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keys = await crypto.subtle.generateKey(algorithm,true,['sign','verify']);
  const updated = {salt:encode(salt),iv:encode(iv),publicKey:await crypto.subtle.exportKey('jwk',keys.publicKey)};
  const newKey = await wrappingKey(next,updated,['wrapKey']);
  updated.wrappedKey = encode(await crypto.subtle.wrapKey('pkcs8',keys.privateKey,newKey,{name:'AES-GCM',iv,additionalData:keyUsage}));
  const result = await env.TVUT_ADMIN_DB.prepare('INSERT INTO admin_auth(id,credential,version) VALUES(1,?,1) ON CONFLICT(id) DO UPDATE SET credential=excluded.credential,version=admin_auth.version+1 WHERE admin_auth.version=?')
    .bind(JSON.stringify(updated),record.version).run();
  if (result.meta.changes !== 1) return '비밀번호가 이미 변경되었습니다. 다시 로그인해 주세요.';
  return '';
}
export async function onRequest({request,env}) {
  const url = new URL(request.url);
  if (url.origin !== origin) return request.method === 'GET' ? redirect(origin + '/admin/') : respond('접속 주소를 확인해 주세요.', 403);
  const route = url.pathname.replace(/\/$/, '');
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== origin) return respond('요청 출처를 확인해 주세요.', 403);
    if (route === '/admin/logout') return redirect('/admin/', sessionCookie('', 0));
    if (!['/admin/login','/admin/password','/admin/naver-report','/admin/indexnow','/admin/article-save','/admin/article-publish','/admin/article-restore','/admin/static-save','/admin/static-publish','/admin/static-restore','/admin/writing-guide'].includes(route)) return respond('페이지를 찾을 수 없습니다.', 404);
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return respond('입력 형식을 확인해 주세요.', 415);
    const limit = ['/admin/article-save','/admin/static-save'].includes(route) ? 600000 : route === '/admin/writing-guide' ? 300000 : route === '/admin/naver-report' ? 65536 : 1024;
    if (Number(request.headers.get('Content-Length')) > limit) return respond('입력이 너무 깁니다.', 413);
    const form = await loginForm(request,limit);
    if (!form) return respond('입력이 너무 깁니다.', 413);
    let record;
    try { record = await currentCredential(env); }
    catch { return respond('관리자 인증 저장소에 연결할 수 없습니다.',503); }
    if (route === '/admin/writing-guide') {
      if (!await signedIn(request,record)) return redirect('/admin/');
      const guide = (form.get('guide') || '').trim();
      if (!guide || guide.length > 30000) return respond(writingGuidePage(guide,'','지침은 1자 이상 30,000자 이하로 입력해 주세요.'),400);
      try { await getWritingGuide(env.TVUT_ADMIN_DB); await env.TVUT_ADMIN_DB.prepare('INSERT INTO admin_writing_guide(id,guide,updated) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET guide=excluded.guide,updated=excluded.updated').bind(guide,new Date().toISOString()).run(); }
      catch { return respond('작성 지침을 저장하지 못했습니다.',503); }
      return redirect('/admin/writing-guide?saved=1');
    }
    if (['/admin/static-save','/admin/static-publish','/admin/static-restore'].includes(route)) {
      if (!await signedIn(request,record)) return redirect('/admin/');
      const path=form.get('path') || '';
      if (!permitted(path,entries)) return respond('수정할 수 없는 페이지입니다.',400);
      try {
        if (route==='/admin/static-save') await saveStatic(env.TVUT_ADMIN_DB,path,entries,form);
        if (route==='/admin/static-publish') await publishStatic(env.TVUT_ADMIN_DB,path,entries,form.get('version'));
        if (route==='/admin/static-restore') await restoreStatic(env.TVUT_ADMIN_DB,path,entries,form.get('version'));
        return redirect('/admin/static-edit?path='+encodeURIComponent(path));
      } catch { return respond('수정 내용을 처리하지 못했습니다. 원본이나 저장된 수정본이 변경되었을 수 있습니다. 이전 화면에서 작성한 내용을 복사한 뒤 다시 확인해 주세요.',400); }
    }
    if (['/admin/article-save','/admin/article-publish','/admin/article-restore'].includes(route)) {
      if (!await signedIn(request,record)) return redirect('/admin/');
      try {
        const slug = route === '/admin/article-save' ? await articleSave(env.TVUT_ADMIN_DB,form) : form.get('slug');
        if (route === '/admin/article-publish') await articlePublish(env.TVUT_ADMIN_DB,slug,form.get('version'));
        if (route === '/admin/article-restore') await articleRestore(env.TVUT_ADMIN_DB,slug,form.get('version'));
        return redirect('/admin/article?slug='+encodeURIComponent(slug));
      } catch (error) {
        if (route === '/admin/article-save') {
          const oldSlug = form.get('old_slug');
          let old = null; try { if (oldSlug) { old = await articleGet(env.TVUT_ADMIN_DB,oldSlug); if (old) old = {...old,updated:form.get('version') || ''}; } } catch {}
          const values = Object.fromEntries(['slug','title','description','body'].map(key=>[key,(form.get(key)||'').slice(0,key==='body'?50000:300)]));
          values.summary=(form.get('summary')||'').slice(0,3000); values.buttonLabel=(form.get('button_label')||'').slice(0,80); values.buttonUrl=(form.get('button_url')||'').slice(0,2048);
          return respond(articleEditor(old,'저장하지 못했습니다. 주소 중복이나 입력값, 동시 수정 여부를 확인해 주세요.',false,values),400);
        }
        return respond('발행 또는 복구하지 못했습니다. 글이 변경되었거나 복구할 이전 발행본이 없습니다. 이전 화면에서 다시 확인해 주세요.',400);
      }
    }
    if (route === '/admin/indexnow') {
      if (!await signedIn(request,record)) return redirect('/admin/');
      const path = form.get('path') || '';
      const all = await searchableEntries(env);
      if (!allowedPath(path,all)) return respond(indexNowPage(all,'/',null,'목록에 있는 공개 페이지만 제출할 수 있습니다.'),400);
      try { const status = await submitIndexNow(path,all); return respond(indexNowPage(all,path,status),status === 200 || status === 202 ? 200 : 502); }
      catch { return respond(indexNowPage(all,path,null,'요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'),502); }
    }
    if (route === '/admin/naver-report') {
      if (!await signedIn(request,record)) return redirect('/admin/');
      try { await saveNaverReport(env.TVUT_ADMIN_DB,form.get('report') || ''); }
      catch { return respond('보고서 형식을 확인해 주세요.',400); }
      return redirect('/admin/analytics?period=30days&naver=saved');
    }
    if (route === '/admin/password') {
      if (!await signedIn(request,record)) return redirect('/admin/');
      const error = await changePassword(env,record,form);
      if (error) return respond(passwordPage(error),400);
      return redirect('/admin/?password=changed',sessionCookie('',0));
    }
    const token = form.get('username') === 'admin' && await newSession(form.get('password') || '',record);
    if (!token) return respond(loginPage(true), 401);
    return redirect('/admin/', sessionCookie(token, lifetime));
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return respond(null, 405, {Allow:'GET, HEAD, POST'});
  if (!['/admin', '/admin/login', '/admin/posts', '/admin/analytics', '/admin/password','/admin/seo','/admin/indexnow','/admin/article','/admin/article-preview','/admin/static-edit','/admin/static-preview','/admin/realtime-data','/admin/realtime-sources-data','/admin/inflows','/admin/inflows-data','/admin/writing-guide','/admin/writing-guide-download'].includes(route)) return respond('페이지를 찾을 수 없습니다.', 404);
  let record;
  try { record = await currentCredential(env); }
  catch { return ['/admin/realtime-data','/admin/realtime-sources-data','/admin/inflows-data'].includes(route) ? jsonRespond({error:'관리자 인증 저장소에 연결할 수 없습니다.'},503) : respond('관리자 인증 저장소에 연결할 수 없습니다.',503); }
  const authenticated = await signedIn(request,record);
  if (route === '/admin/realtime-data') {
    if (!authenticated) return jsonRespond({error:'로그인이 필요합니다.'},401);
    if (request.method === 'HEAD') return new Response(null,{status:200,headers:{'Cache-Control':'private, no-store'}});
    try { return jsonRespond(await fetchRealtime(env)); }
    catch (error) { return jsonRespond({error:error.message || '실시간 통계를 조회하지 못했습니다.'},503); }
  }
  if (route === '/admin/realtime-sources-data') {
    if (!authenticated) return jsonRespond({error:'로그인이 필요합니다.'},401);
    if (request.method === 'HEAD') return new Response(null,{status:200,headers:{'Cache-Control':'private, no-store'}});
    try { return jsonRespond(await readSources(env.TVUT_ADMIN_DB)); }
    catch { return jsonRespond({error:'실시간 유입 경로를 불러오지 못했습니다.'},503); }
  }
  if (route === '/admin/inflows-data') {
    if (!authenticated) return jsonRespond({error:'로그인이 필요합니다.'},401);
    if (request.method === 'HEAD') return new Response(null,{status:200,headers:{'Cache-Control':'private, no-store'}});
    const source=url.searchParams.get('source') || '', path=(url.searchParams.get('path') || '').trim();
    if ((source && !isAllowedSource(source)) || path.length>120) return jsonRespond({error:'검색 조건을 확인해 주세요.'},400);
    try { return jsonRespond(await readEvents(env.TVUT_ADMIN_DB,{source,path})); }
    catch { return jsonRespond({error:'유입 기록을 불러오지 못했습니다.'},503); }
  }
  if (!authenticated && ['/admin/posts','/admin/analytics','/admin/password','/admin/seo','/admin/indexnow','/admin/article','/admin/article-preview','/admin/static-edit','/admin/static-preview','/admin/inflows','/admin/writing-guide','/admin/writing-guide-download'].includes(route)) return redirect('/admin/');
  if (request.method === 'HEAD') return respond(null);
  if (!authenticated) return respond(loginPage(false,url.searchParams.get('password') === 'changed'));
  if (route === '/admin/writing-guide' || route === '/admin/writing-guide-download') {
    try { const saved=await getWritingGuide(env.TVUT_ADMIN_DB); if (route.endsWith('-download')) return new Response(saved.guide,{headers:{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="tvut-writing-guide.txt"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}); return respond(writingGuidePage(saved.guide,saved.updated,url.searchParams.has('saved')?'작성 지침을 저장했습니다.':'')); }
    catch { return respond('작성 지침을 불러오지 못했습니다.',503); }
  }
  if (route === '/admin/password') return respond(passwordPage());
  if (route === '/admin/inflows') return respond(inflowsPage());
  if (route === '/admin/static-edit' || route === '/admin/static-preview') {
    const path=url.searchParams.get('path') || '';
    if (!permitted(path,entries)) return respond('수정할 수 없는 페이지입니다.',400);
    try {
      const html=await originalPage(path,entries), hash=await fingerprint(html), row=await getStatic(env.TVUT_ADMIN_DB,path);
      if (route === '/admin/static-preview') {
        if (!row || hash!==row.source_hash) return respond('미리보기할 수정본이 없거나 원본이 변경되었습니다.',409);
        return respond(applyChanges(html,JSON.parse(row.draft)));
      }
      return respond(staticEditor(path,fields(html),hash,row));
    } catch { return respond('원본 페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',502); }
  }
  if (route === '/admin/article' || route === '/admin/article-preview') {
    const slug = url.searchParams.get('slug');
    if (route === '/admin/article' && !slug) return respond(articleEditor());
    const article = await articleGet(env.TVUT_ADMIN_DB,slug);
    if (!article) return respond('글을 찾을 수 없습니다.',404);
    if (route === '/admin/article-preview') return respond(renderArticle(JSON.parse(article.draft),true));
    return respond(articleEditor(article,'',await articleHasRevision(env.TVUT_ADMIN_DB,slug)));
  }
  if (route === '/admin/indexnow') return respond(indexNowPage(await searchableEntries(env)));
  if (route === '/admin/seo') {
    const all = await searchableEntries(env);
    const path = url.searchParams.get('path');
    if (path === null) return respond(seoPage(all));
    if (!allowedPath(path,all)) return respond(seoPage(all,'/',null,'목록에 있는 공개 페이지만 진단할 수 있습니다.'),400);
    try { return respond(seoPage(all,path,await diagnose(path,all))); }
    catch { return respond(seoPage(all,path,null,'페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),502); }
  }
  if (route === '/admin/analytics') {
    const period = url.searchParams.get('period') || '30days';
    try {
      const reports = await fetchAnalytics(env,period);
      let search = null, searchError = '';
      try { search = await fetchSearch(env,period); } catch (error) { searchError = error.message; }
      let naver = null;
      try { naver = await readNaverReport(env.TVUT_ADMIN_DB,({'today':'1','7days':'7','30days':'30','60days':'60','90days':'90'})[period] || '30'); } catch {}
      return respond(analyticsPage(reports,period,'',search,searchError,url.searchParams.get('q') || '',naver));
    }
    catch (error) { return respond(analyticsPage(null,period,error.message)); }
  }
  if (route === '/admin/posts') return respond(postsPage(entries, url.searchParams.get('q') || '',await articleList(env.TVUT_ADMIN_DB)));
  let reports = null;
  try { reports = await fetchAnalytics(env,'30days'); } catch {}
  return respond(dashboardPage(entries, reports));
}
