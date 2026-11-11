import {recordSource} from '../../scripts/realtime-sources.mjs';
import {validDetail,recordEvent} from '../../scripts/inflow-events.mjs';
const origin='https://tvut.3678dairy.com';
export async function onRequest({request,env}) {
  if (request.method!=='POST') return new Response(null,{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
  if (request.headers.get('Origin')!==origin || !request.headers.get('Content-Type')?.startsWith('text/plain')) return new Response(null,{status:403,headers:{'Cache-Control':'no-store'}});
  if (Number(request.headers.get('Content-Length'))>2048 || !request.body) return new Response(null,{status:413});
  const reader=request.body.getReader(); let size=0, raw=''; const decoder=new TextDecoder();
  try { while(true) { const part=await reader.read(); if(part.done) break; size+=part.value.length; if(size>2048) { await reader.cancel(); return new Response(null,{status:413}); } raw+=decoder.decode(part.value,{stream:true}); } raw+=decoder.decode(); }
  finally { reader.releaseLock(); }
  let value; try { value=JSON.parse(raw); } catch { return new Response(null,{status:400,headers:{'Cache-Control':'no-store'}}); }
  const keys=value && typeof value==='object' && !Array.isArray(value) ? Object.keys(value).sort().join(',') : '';
  if (!['path,source','detail,path,source'].includes(keys)) return new Response(null,{status:400,headers:{'Cache-Control':'no-store'}});
  const detail=validDetail(value.detail);
  if (!detail) return new Response(null,{status:400,headers:{'Cache-Control':'no-store'}});
  try {
    if (!await recordSource(env.TVUT_ADMIN_DB,value.source,value.path)) return new Response(null,{status:400,headers:{'Cache-Control':'no-store'}});
    await recordEvent(env.TVUT_ADMIN_DB,value.source,value.path,detail);
  }
  catch { return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}}); }
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
