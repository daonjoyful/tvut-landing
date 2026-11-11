import {articleGet,renderArticle,publishedArticles,renderArticleIndex} from '../../../scripts/admin-articles.mjs';

export async function onRequest({request,env}) {
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const url = new URL(request.url);
  if (url.pathname === '/review/notice/') {
    const rows = await publishedArticles(env.TVUT_ADMIN_DB);
    return new Response(request.method === 'HEAD' ? null : renderArticleIndex(rows),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
  }
  const match = url.pathname.match(/^\/review\/notice\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/);
  if (!match) return new Response('찾을 수 없습니다.',{status:404});
  const row = await articleGet(env.TVUT_ADMIN_DB,match[1]);
  if (!row?.published) return new Response('찾을 수 없습니다.',{status:404,headers:{'Cache-Control':'no-store'}});
  const body = request.method === 'HEAD' ? null : renderArticle(JSON.parse(row.published));
  return new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
}
