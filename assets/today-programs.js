(() => {
  const notice=document.getElementById('today-status');
  if(!notice) return;
  fetch('/api/today-programs',{headers:{accept:'application/json'}}).then(response=>{
    if(!response.ok) throw Error('unavailable');
    return response.json();
  }).then(data=>{
    if(!data.available || !data.source) throw Error('unavailable');
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(data.date!==today) throw Error('stale');
    const [year,month,day]=data.date.split('-');
    notice.textContent=`${year}년 ${Number(month)}월 ${Number(day)}일 KBS 방송정보 기준 · 방송 예정 내용은 달라질 수 있습니다.`;
    document.querySelectorAll('[data-program-today]').forEach(el=>{
      const text=data.items?.[el.dataset.programToday];
      el.textContent=text || '오늘 정보가 아직 확인되지 않았습니다.';
    });
    document.querySelectorAll('[data-today-link]').forEach(link=>{link.href=data.source;});
  }).catch(()=>{
    notice.textContent='오늘 방송정보를 불러오지 못했습니다. KBS 공식 방송정보에서 확인해 주세요.';
    document.querySelectorAll('[data-program-today]').forEach(el=>{el.textContent='KBS 공식 방송정보에서 날짜를 선택해 확인해 주세요.';});
  });
})();
