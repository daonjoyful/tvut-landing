(function(){
  'use strict';
  var form=document.getElementById('inflow-filters'),body=document.getElementById('inflow-rows'),status=document.getElementById('inflow-status');
  if(!form||!body||!status)return;
  var labels={'naver-search':'네이버 검색','naver-other':'네이버 기타','google-search':'구글','daum-search':'다음 검색','bing-search':'빙','ai-chatgpt':'ChatGPT','ai-claude':'Claude','ai-perplexity':'Perplexity','ai-other':'기타 AI 서비스','external':'기타 외부','internal':'사이트 내부 이동','unknown':'출처 미확인'};
  var running=false;
  function clean(value){return value==='not_provided'?'미제공':value==='other'?'목록 외':value==='internal'?'사이트 내부':String(value||'미제공');}
  async function refresh(){
    if(running||document.hidden)return;
    running=true;
    try{
      var params=new URLSearchParams(new FormData(form));
      var response=await fetch('/admin/inflows-data?'+params.toString(),{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(response.status===401)throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
      var data=await response.json(); if(!response.ok)throw new Error(data.error||'유입 기록을 조회하지 못했습니다.');
      body.replaceChildren();
      if(!data.rows.length){var tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=8;td.textContent='선택한 조건의 기록이 없습니다.';tr.appendChild(td);body.appendChild(tr);}
      else data.rows.forEach(function(row){
        var tr=document.createElement('tr');
        var time=new Date(Number(row.occurred_at)).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
        [time,labels[row.source]||'기타',clean(row.host),clean(row.search),clean(row.utm_source),clean(row.utm_term),clean(row.campaign),row.path].forEach(function(value){var td=document.createElement('td');td.textContent=String(value);tr.appendChild(td)});
        body.appendChild(tr);
      });
      status.textContent='표시 '+data.rows.length+'건 · 마지막 확인 '+new Date(data.checkedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit'});
    }catch(error){status.textContent=(error instanceof TypeError?'유입 기록 연결에 실패했습니다.':(error.message||'유입 기록을 조회하지 못했습니다.'))+' 이전 표시 내용은 갱신되지 않았습니다.';}
    finally{running=false;}
  }
  form.addEventListener('submit',function(event){event.preventDefault();refresh()});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});
  refresh();setInterval(refresh,60000);
})();
