document.querySelectorAll('.copy-index-url').forEach(button=>button.addEventListener('click',async()=>{
  const status=document.getElementById('index-copy-status');
  try {await navigator.clipboard.writeText(button.dataset.url);status.textContent='페이지 주소를 복사했습니다.';}
  catch {status.textContent='주소 복사에 실패했습니다. 목록에 표시된 주소를 직접 복사해 주세요.';}
}));

const bulkForm=document.getElementById('index-bulk-form'), allBox=document.getElementById('index-select-all'), countLabel=document.getElementById('index-selected-count');
if(bulkForm&&allBox&&countLabel){
  const boxes=Array.from(document.querySelectorAll('input[name="paths"][form="index-bulk-form"]')),submit=bulkForm.querySelector('button[type="submit"]');submit.disabled=false;
  const update=()=>{const n=boxes.filter(x=>x.checked).length;countLabel.textContent=n+'개 선택';allBox.checked=boxes.length>0&&n===boxes.length;allBox.indeterminate=n>0&&n<boxes.length;};
  allBox.addEventListener('change',()=>{boxes.forEach(x=>x.checked=allBox.checked);update();});
  boxes.forEach(x=>x.addEventListener('change',update));
  bulkForm.addEventListener('submit',async e=>{
    e.preventDefault();const chosen=boxes.filter(x=>x.checked),engine=bulkForm.elements.engine.value,status=bulkForm.elements.status.value;
    if(!chosen.length){countLabel.textContent='글을 먼저 선택해 주세요.';return;}
    if(!['색인완료','미색인'].includes(status))return;
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());let completed=0;submit.disabled=true;allBox.disabled=true;boxes.forEach(x=>x.disabled=true);
    for(const box of chosen){
      try{
        const body=new URLSearchParams({engine,path:box.value,work_date:day,status});
        const r=await fetch('/admin/indexing-log',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,credentials:'same-origin'});
        const final=new URL(r.url);
        if(!r.ok||final.origin!==location.origin||final.pathname!=='/admin/indexing'||final.searchParams.get('saved')!=='1')throw new Error('save failed');
        completed++;countLabel.textContent=completed+'/'+chosen.length+'개 저장';box.checked=false;
      }catch{countLabel.textContent=completed+'개 저장됨 · 나머지는 저장하지 못했습니다. 새로고침 후 확인해 주세요.';submit.disabled=false;allBox.disabled=false;boxes.forEach(x=>x.disabled=false);return;}
    }
    location.assign('/admin/indexing?engine='+encodeURIComponent(engine)+'&saved=1');
  });
}
