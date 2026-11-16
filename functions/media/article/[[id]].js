export async function onRequestGet({request,env}) {
  const match = new URL(request.url).pathname.match(/^\/media\/article\/([0-9a-f-]{36})\/?$/);
  if(!match) return new Response('Not found',{status:404});
  try {
    const path='/media/article/'+match[1];
    const row=await env.TVUT_ADMIN_DB.prepare('SELECT i.type,i.bytes FROM article_images i WHERE i.id=? AND EXISTS (SELECT 1 FROM admin_articles a WHERE a.published IS NOT NULL AND instr(a.published, ?) > 0) LIMIT 1').bind(match[1],path).first();
    if(!row)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
    return new Response(new Uint8Array(row.bytes),{headers:{'Content-Type':row.type,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
  } catch { return new Response('Unavailable',{status:503,headers:{'Cache-Control':'no-store'}}); }
}
