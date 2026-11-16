const origin='https://tvut.3678dairy.com';
const categories=[['아침마당',/아침\s*마당|amplaza/i],['생생정보',/생생\s*정보|reallive/i],['무엇이든 물어보세요',/무엇이든\s*물어보세요|whatever/i],['6시 내고향',/6\s*시\s*내\s*고향|sixhour/i],['티벗 설치·이용',/티벗|tvut/i]];
export function category(text){return categories.find(([,re])=>re.test(text||''))?.[0]||'기타';}
export function linkCatalog(staticLinks,entries,articles){
  const result=new Map();
  const add=(url,label,source,type)=>{try{let u=new URL(url,origin);if(!['http:','https:','tel:','mailto:'].includes(u.protocol))return;const key=u.href;let item=result.get(key);if(!item){item={url:key,labels:[],sources:[],type};result.set(key,item);}if(type==='내부 글'){item.type=type;if(label){item.labels=item.labels.filter(x=>x!==label);item.labels.unshift(label);}}else if(label&&!item.labels.includes(label))item.labels.push(label);if(source&&!item.sources.includes(source))item.sources.push(source);}catch{}};
  for(const row of staticLinks)for(const source of row.sources)for(const label of row.labels.length?row.labels:[''])add(row.url,label,source,'정적 페이지');
  for(const row of entries)add(row.url,row.title,'공개 페이지 목록','내부 글');
  for(const row of articles){if(!row.published)continue;let a;try{a=JSON.parse(row.published);}catch{continue;}const source='/review/notice/'+row.slug+'/';add(source,a.title,source,'내부 글');if(a.buttonUrl)add(a.buttonUrl,a.buttonLabel,source,'발행 글');for(const match of (a.body||'').matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)/g))add(match[2],match[1],source,'발행 글');}
  return [...result.values()];
}
export function relatedLinks(title,slug,links){
  const group=category(title);if(group==='기타')return [];
  const words=(title.toLowerCase().match(/[가-힣a-z0-9]{2,}/g)||[]).filter(w=>!['티벗','tvut','바로가기','방법','참여','안내','오늘','방송','정보'].includes(w));
  return links.filter(item=>{const u=new URL(item.url);const eligible=item.type==='내부 글'||(u.hostname==='daonjoyful.com'&&u.pathname.length>2);const text=item.labels.join(' ').toLowerCase();return eligible&&item.url!==origin+'/review/notice/'+slug+'/'&&category(text)===group&&item.labels[0]&&item.labels[0].length>=6&&words.some(w=>text.includes(w));}).sort((a,b)=>(a.type==='내부 글'?0:1)-(b.type==='내부 글'?0:1)).slice(0,2);
}
export function appendRelated(body,title,slug,links){
  const picks=relatedLinks(title,slug,links).filter(item=>!body.includes(item.url)&&!body.includes(new URL(item.url).pathname));
  if(!picks.length)return body;
  return body.trimEnd()+'\n\n## 함께 읽을 글\n\n'+picks.map(item=>'- ['+item.labels[0].replace(/[\[\]]/g,'')+']('+item.url+')').join('\n');
}
