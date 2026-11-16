const uploadButton=document.getElementById('cover-upload');
const fileInput=document.getElementById('cover-file');
const coverStatus=document.getElementById('cover-status');
uploadButton?.addEventListener('click',async()=>{
  const file=fileInput.files[0];
  if(!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>512000){coverStatus.textContent='500KB 이하의 JPG, PNG, WebP 파일을 선택해 주세요.';return;}
  uploadButton.disabled=true;coverStatus.textContent='이미지를 올리는 중입니다.';
  try {
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
    const response=await fetch('/admin/article-image-upload',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({image:data})});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'이미지를 올리지 못했습니다.');
    document.getElementById('thumbnail').value=result.path;
    coverStatus.textContent='이미지를 올렸습니다. 글을 임시저장한 뒤 미리보기에서 확인하세요.';
  }catch(error){coverStatus.textContent=error.message||'이미지를 올리지 못했습니다. 다시 시도해 주세요.';}
  finally{uploadButton.disabled=false;}
});
const generateButton=document.getElementById('ai-generate');
const generateStatus=document.getElementById('ai-status');
generateButton?.addEventListener('click',async()=>{
  const title=document.getElementById('article-title').value.trim();
  const source=document.getElementById('ai-source').value.trim();
  const keyword=document.getElementById('ai-keyword')?.value.trim() || '';
  const body=document.getElementById('body'), description=document.getElementById('description');
  if(!title||source.length<30){generateStatus.textContent='제목과 확인 자료를 30자 이상 입력해 주세요.';return;}
  if(body.value.trim()||description.value.trim()){generateStatus.textContent='기존 원고 보호를 위해 본문과 검색 설명이 비어 있을 때만 생성합니다.';return;}
  generateButton.disabled=true;generateStatus.textContent='원고를 생성하고 있습니다. 최대 1분 정도 걸릴 수 있습니다.';
  try {
    const response=await fetch('/admin/article-generate',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({title,source,keyword})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'원고를 생성하지 못했습니다.');
    if(body.value.trim()||description.value.trim()){generateStatus.textContent='생성 중 편집 내용이 변경되어 덮어쓰지 않았습니다.';return;}
    body.value=result.body;description.value=result.description;
    const generation=document.getElementById('generation-id');if(generation)generation.value=result.generationId||'';
    generateStatus.textContent='초안이 입력되었습니다. 내용과 출처를 직접 검수한 뒤 임시저장하세요.'+(result.usageWarning?' '+result.usageWarning:'');
  }catch(error){generateStatus.textContent=error.message||'원고를 생성하지 못했습니다.';}
  finally{generateButton.disabled=false;}
});
