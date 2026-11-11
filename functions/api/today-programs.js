const listUrl = 'https://iaudience.kbs.co.kr/broadcast';
const programs = {'아침마당':'amplaza','2TV 생생정보':'reallive','무엇이든 물어보세요':'whatever','6시 내고향':'sixhour'};
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300','x-content-type-options':'nosniff'}});
const daySeoul = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const decode = text => text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' '}[x]));
export function parseListing(html,date) {
  for (const row of html.match(/<tr\b[\s\S]*?<\/tr>/gi)||[]) {
    const href=row.match(/href=["'](\/broadcast\/\d+)["']/i), day=row.match(/class=["']txt_datetime["'][^>]*>\s*(\d{4}\.\d{2}\.\d{2})/i);
    if(href && day && day[1].replace(/\./g,'-')===date) return 'https://iaudience.kbs.co.kr'+href[1];
  }
  return null;
}
export function parsePrograms(html) {
  const found={};
  const re=/<p\s+class=["']program_title["'][^>]*>\s*([^<]+?)\s*<\/p>\s*<div\s+class=["']program_desc_box["'][^>]*>([\s\S]*?)<\/div>/gi;
  for(const match of html.matchAll(re)) {
    const key=programs[decode(match[1].trim())]; if(!key || found[key]) continue;
    const raw=match[2].trim(), heading=raw.match(/^\s*<([^<>]{2,100})>/);
    let text=heading ? heading[1] : raw.split(/<br\s*\/?\s*>/i)[0].replace(/<[^>]*>/g,'');
    text=decode(text).replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90);
    if(text) found[key]=text;
  }
  return found;
}
export async function onRequestGet() {
  const date=daySeoul();
  try {
    const opts={signal:AbortSignal.timeout(8000),headers:{'Accept':'text/html'}};
    const listing=await fetch(listUrl,opts); if(!listing.ok) throw Error('listing');
    const url=parseListing(await listing.text(),date); if(!url) return json({date,available:false,items:{} });
    const detail=await fetch(url,{signal:AbortSignal.timeout(8000),headers:{'Accept':'text/html'}}); if(!detail.ok) throw Error('detail');
    return json({date,available:true,source:url,items:parsePrograms(await detail.text())});
  } catch {return json({date,available:false,items:{}},503);}
}
