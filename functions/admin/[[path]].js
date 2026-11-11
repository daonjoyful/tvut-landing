import credential from './credential.json';
import entries from './catalog.json';
import {loginPage, dashboardPage, postsPage, analyticsPage, passwordPage} from '../../scripts/admin-view.mjs';
import {fetchAnalytics} from '../../scripts/admin-analytics.mjs';
import {fetchSearch} from '../../scripts/admin-search.mjs';

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
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extra
  }});
}
function redirect(location, cookie) {
  return respond(null, 303, cookie ? {Location:location, 'Set-Cookie':cookie} : {Location:location});
}
function sessionCookie(value, age) {
  return cookieName + '=' + value + '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=' + age;
}
async function loginForm(request) {
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
      if (bytes > 1024) {
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
    if (!['/admin/login','/admin/password'].includes(route)) return respond('페이지를 찾을 수 없습니다.', 404);
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return respond('입력 형식을 확인해 주세요.', 415);
    if (Number(request.headers.get('Content-Length')) > 1024) return respond('입력이 너무 깁니다.', 413);
    const form = await loginForm(request);
    if (!form) return respond('입력이 너무 깁니다.', 413);
    let record;
    try { record = await currentCredential(env); }
    catch { return respond('관리자 인증 저장소에 연결할 수 없습니다.',503); }
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
  if (!['/admin', '/admin/login', '/admin/posts', '/admin/analytics', '/admin/password'].includes(route)) return respond('페이지를 찾을 수 없습니다.', 404);
  let record;
  try { record = await currentCredential(env); }
  catch { return respond('관리자 인증 저장소에 연결할 수 없습니다.',503); }
  const authenticated = await signedIn(request,record);
  if (!authenticated && ['/admin/posts','/admin/analytics','/admin/password'].includes(route)) return redirect('/admin/');
  if (request.method === 'HEAD') return respond(null);
  if (!authenticated) return respond(loginPage(false,url.searchParams.get('password') === 'changed'));
  if (route === '/admin/password') return respond(passwordPage());
  if (route === '/admin/analytics') {
    const period = url.searchParams.get('period') || '30days';
    try {
      const reports = await fetchAnalytics(env,period);
      let search = null, searchError = '';
      try { search = await fetchSearch(env,period); } catch (error) { searchError = error.message; }
      return respond(analyticsPage(reports,period,'',search,searchError,url.searchParams.get('q') || ''));
    }
    catch (error) { return respond(analyticsPage(null,period,error.message)); }
  }
  if (route === '/admin/posts') return respond(postsPage(entries, url.searchParams.get('q') || ''));
  let reports = null;
  try { reports = await fetchAnalytics(env,'30days'); } catch {}
  return respond(dashboardPage(entries, reports));
}
