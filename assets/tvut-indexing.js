document.querySelectorAll('.copy-index-url').forEach(button=>button.addEventListener('click',async()=>{
  const status=document.getElementById('index-copy-status');
  try {await navigator.clipboard.writeText(button.dataset.url);status.textContent='페이지 주소를 복사했습니다.';}
  catch {status.textContent='주소 복사에 실패했습니다. 목록에 표시된 주소를 직접 복사해 주세요.';}
}));
