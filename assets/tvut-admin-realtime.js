(function () {
  'use strict';
  var panel=document.getElementById('realtime-panel');
  if (!panel) return;
  var total=document.getElementById('realtime-users'), status=document.getElementById('realtime-status'), body=document.getElementById('realtime-pages'), button=document.getElementById('realtime-refresh');
  var busy=false;
  async function refresh() {
    if (busy || document.hidden) return;
    busy=true; button.disabled=true;
    try {
      var response=await fetch('/admin/realtime-data',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if (response.status===401) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
      var data=await response.json();
      if (!response.ok) throw new Error(data.error || '실시간 통계를 조회하지 못했습니다.');
      total.textContent=Number(data.activeUsers).toLocaleString('ko-KR')+'명';
      body.replaceChildren();
      if (!data.pages.length) {
        var empty=document.createElement('tr'), cell=document.createElement('td');
        cell.colSpan=2; cell.textContent='최근 30분 동안 표시할 페이지 조회가 없습니다.'; empty.appendChild(cell); body.appendChild(empty);
      } else data.pages.forEach(function (row) {
        var tr=document.createElement('tr'), name=document.createElement('td'), views=document.createElement('td');
        name.textContent=row.title; views.textContent=Number(row.views).toLocaleString('ko-KR'); tr.append(name,views); body.appendChild(tr);
      });
      status.textContent='마지막 확인 '+new Date(data.checkedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · 화면을 보는 동안 1분마다 갱신';
    } catch(error) {
      status.textContent=(error.message || '실시간 통계를 조회하지 못했습니다.')+' 이전에 표시된 값은 갱신되지 않았습니다.';
    } finally { busy=false; button.disabled=false; }
  }
  button.addEventListener('click',refresh);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});
  refresh(); setInterval(refresh,60000);
})();
