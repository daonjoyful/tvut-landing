import entries from '../admin/catalog.json';
import {permitted,getStaticExisting,fingerprint,applyChanges} from '../../scripts/admin-static-editor.mjs';

export async function onRequest(context) {
  const {request,env,next} = context;
  const url = new URL(request.url);
  if (!permitted(url.pathname,entries) || !['GET','HEAD'].includes(request.method)) return next();
  const source = await next();
  if (url.searchParams.get('__editor_original') === '1') {
    const headers=new Headers(source.headers); headers.set('X-Robots-Tag','noindex, nofollow'); headers.set('Cache-Control','no-store');
    return new Response(source.body,{status:source.status,statusText:source.statusText,headers});
  }
  if (request.method==='HEAD' || source.status!==200 || !/text\/html/i.test(source.headers.get('content-type')||'')) return source;
  try {
    const row=await getStaticExisting(env.TVUT_ADMIN_DB,url.pathname);
    if (!row?.published) return source;
    const html=await source.clone().text();
    if (await fingerprint(html)!==row.source_hash) return source;
    const changed=applyChanges(html,JSON.parse(row.published));
    const headers=new Headers(source.headers);
    headers.delete('content-length'); headers.delete('etag'); headers.set('Cache-Control','no-store');
    return new Response(changed,{status:source.status,statusText:source.statusText,headers});
  } catch { return source; }
}
