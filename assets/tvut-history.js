const search=document.getElementById('history-search');
search?.addEventListener('input',()=>{
  const value=search.value.trim().toLocaleLowerCase('ko');
  document.querySelectorAll('.history-panel tbody tr').forEach(row=>{row.hidden=Boolean(value)&&!row.textContent.toLocaleLowerCase('ko').includes(value);});
});
