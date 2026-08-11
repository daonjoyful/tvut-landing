ͲǞѦŖئ{N,yʧvî֛ͩmport fs from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/build-review.mjs content/review-inbox/input.json');
const item = JSON.parse(await fs.readFile(inputPath, 'utf8'));
for (const key of ['program', 'broadcastDate', 'title', 'summary', 'officialUrl', 'videoUrl']) {
  if (!item[key]) throw new Error(`Missing required field: ${key}`);
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const slug = { '아침마당':'amplaza', '2TV 생생정보':'reallive', '무엇이든 물어보세요':'whatever' }[item.program] ?? 'other';
const paragraphs = String(item.summary).split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
const headingFrom = (text, index) => { const supplied = item.headings?.[index - 1]; if (supplied) return supplied; const first = text.split(/[.!?。！？]/)[0].trim().replace(/(했습니다|되었습니다|이어졌습니다|소개됐습니다|확인할 수 있습니다|입니다|합니다)$/,'').trim(); return first.length > 30 ? `${first.slice(0, 30).trim()}…` : first; };\nconst body = paragraphs.map((p, i) => `<h2>${i === 0 ? '오늘 방송 핵심 내용' : esc(headingFrom(p, i))}</h2><p>${esc(p)}</p>`).join('');
const intro = paragraphs[0] ?? item.title;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(item.title)}</title><meta name="description" content="${esc(intro.slice(0,150))}"><link rel="canonical" href="https://tvut.3678dairy.com/review/${slug}/${item.broadcastDate}/"><link rel="stylesheet" href="../../../review.css"></head><body><header class="review-header"><div class="review-wrap review-header-inner"><a class="review-brand" href="/">티벗 퀴즈 안내</a><nav class="review-nav"><a href="/review/">전체 리뷰</a><a href="/review/${slug}/">${esc(item.program)} 안내</a></nav></div></header><main class="review-main review-wrap"><article class="review-article"><p class="eyebrow">${esc(item.program)} · ${esc(item.broadcastDate)}</p><h1>${esc(item.title)}</h1><p class="review-meta">방송일 ${esc(item.broadcastDate)} · 공식 영상과 공개 설명을 바탕으로 작성</p><nav class="review-note" aria-label="목차"><strong>목차</strong><ol><li><a href="#summary">방송 핵심 내용</a></li><li><a href="#guide">시청자가 확인할 점</a></li><li><a href="#tvut">티벗 참여 안내</a></li></ol></nav><p class="review-intro">${esc(intro)}</p><div class="review-ad" aria-label="광고">광고</div><section id="summary">${body}</section><section id="guide"><h2>시청자가 확인할 점</h2><p>방송 내용은 회차와 방송 시점에 따라 달라질 수 있습니다. 세부 내용은 공식 KBS 영상과 프로그램 페이지에서 확인하는 것이 가장 정확합니다.</p></section><section id="tvut"><h2>티벗 참여 안내</h2><p>티벗 앱을 설치하고 로그인하면 방송별 참여 화면과 이벤트를 확인할 수 있습니다. 참여 조건과 발표 방식은 방송 중 안내와 공식 공지를 기준으로 확인하세요.</p></section><div class="review-actions"><a class="review-button" href="${esc(item.officialUrl)}" target="_blank" rel="noopener">공식 KBS 페이지</a><a class="review-button secondary" href="${esc(item.videoUrl)}" target="_blank" rel="noopener">공식 영상 보기</a></div><div class="review-note">이 글은 공식 방송 정보를 바탕으로 작성한 비공식 정보 안내입니다. 방송 대본·자막을 그대로 복사하지 않았으며, 정확한 내용은 공식 KBS 페이지에서 확인하세요.</div></article></main><footer class="review-footer"><div class="review-wrap"><a href="/review/">방송 리뷰 허브로 돌아가기</a></div></footer></body></html>`;
const outDir = path.join('review', slug, item.broadcastDate);
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, 'index.html');
await fs.writeFile(outPath, html, 'utf8');
console.log(`Generated ${outPath}`);
