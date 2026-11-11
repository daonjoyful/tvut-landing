import credential from './credential.json';
import entries from './catalog.json';
import {loginPage, dashboardPage, postsPage, analyticsPage} from '../../scripts/admin-view.mjs';
import {fetchAnalytics} from '../../scripts/admin-analytics.mjs';

const origin = 'https://tvut.3678dairy.com';
const cookieName = '__Host-tvut_admin';
const lifetime = 3600;
const encoder = new TextEncoder();
const algorithm = {name: 'ECDSA', namedCurve: 'P-256'};
const signature = {name: 'ECDSA', hash: 'SHA-256'};
const keyUsage = encoder.encode('tvut/admin/signing-key/v1');
let verificationKey;

function decode(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
}
function encode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function publicKey() {
  return verificationKey ??= crypto.subtle.importKey('jwk', credential.publicKey, algorithm, false, ['verify']);
}
async function newSession(password) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(password)) return null;
  try {
    // The generated 256-bit password unwraps the signing key only during login.
    const wrappingKey = await crypto.subtle.importKey('raw', decode(password), 'AES-GCM', false, ['unwrapKey']);
    const privateKey = await crypto.subtle.unwrapKey('pkcs8', decode(credential.wrappedKey), wrappingKey,
      {name:'AES-GCM', iv:decode(credential.iv), additionalData:keyUsage}, algorithm, false, ['sign']);
    const now = Math.floor(Date.now() / 1000);
    const claims = encode(encoder.encode(JSON.stringify({sub:'admin', aud:origin, iat:now, exp:now + lifetime, jti:crypto.randomUUID()})));
    return claims + '.' + encode(await crypto.subtle.sign(signature, privateKey, encoder.encode(claims)));
  } catch { return null; }
}
async function signedIn(request) {
  const cookie = (request.headers.get('Cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='));
  if (!cookie || cookie.length > 1024) return false;
  try {
    const parts = cookie.slice(cookieName.length + 1).split('.');
    if (parts.length !== 2) return false;
    const [payload, proof] = parts;
    if (!await crypto.subtle.verify(signature, await publicKey(), decode(proof), encoder.encode(payload))) return false;
    const claims = JSON.parse(new TextDecoder().decode(decode(payload)));
    const now = Math.floor(Date.now() / 1000);
    return claims.sub === 'admin' && claims.aud === origin && Number.isSafeInteger(claims.iat) &&
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
export async function onRequest({request,env}) {
  const url = new URL(request.url);
  if (url.origin !== origin) return request.method === 'GET' ? redirect(origin + '/admin/') : respond('접속 주소를 확인해 주세요.', 403);
  const route = url.pathname.replace(/\/$/, '');
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== origin) return respond('요청 출처를 확인해 주세요.', 403);
    if (route === '/admin/logout') return redirect('/admin/', sessionCookie('', 0));
    if (route !== '/admin/login') return respond('페이지를 찾을 수 없습니다.', 404);
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return respond('입력 형식을 확인해 주세요.', 415);
    if (Number(request.headers.get('Content-Length')) > 1024) return respond('입력이 너무 깁니다.', 413);
    const form = await loginForm(request);
    if (!form) return respond('입력이 너무 깁니다.', 413);
    const token = form.get('username') === 'admin' && await newSession(form.get('password') || '');
    if (!token) return respond(loginPage(true), 401);
    return redirect('/admin/', sessionCookie(token, lifetime));
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return respond(null, 405, {Allow:'GET, HEAD, POST'});
  if (!['/admin', '/admin/login', '/admin/posts', '/admin/analytics'].includes(route)) return respond('페이지를 찾을 수 없습니다.', 404);
  const authenticated = await signedIn(request);
  if (!authenticated && ['/admin/posts','/admin/analytics'].includes(route)) return redirect('/admin/');
  if (request.method === 'HEAD') return respond(null);
  if (!authenticated) return respond(loginPage(false));
  if (route === '/admin/analytics') {
    const period = url.searchParams.get('period') || '30days';
    try { return respond(analyticsPage(await fetchAnalytics(env,period),period)); }
    catch (error) { return respond(analyticsPage(null,period,error.message)); }
  }
  return respond(route === '/admin/posts' ? postsPage(entries, url.searchParams.get('q') || '') : dashboardPage(entries));
}
