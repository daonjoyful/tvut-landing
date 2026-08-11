import fs from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/build-review.mjs content/review-inbox/input.json');
const item = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const required = ['program', 'broadcastDate', 'title', 'summary', 'officialUrl', 'videoUrl'];
for (const key of required) if (!item[key]) throw new Error(`Missing required field: ${key}`);
if (item.summary.trim().length < 500) throw new Error('Summary is too short; review generation is held.');

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = item.program === '아침마당' ? 'amplaza' : item.program === '2TV 생생정보' ? 'reallive' : 'whatever';
const paragraphs = item.summary.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
const body = paragraphs.map((p, i) => `<h3>${i === 0 ? '방송 핵심 내용' : `주요 내용 ${i}`}</h3><p>${esc(p)}</p>`).join('\n');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(item.title)}</title><meta name="description" content="${esc(item.summary.slice(0,150))}"><link rel="canonical" href="https://tvut.3678dairy.com/review/${slug}/${item.broadcastDate}/"><link rel="stylesheet" href="../../../review.css"></head><body><header class="review-header"><div class="review-wrap review-header-inner"><a class="review-brand" href="/">티벗 퀴즈 안내</a><nav class="review-nav"><a href="/review/">전체 리뷰</a><a href="/review/${slug}/">${esc(item.program)} 안내</a></nav></div></header><main class="review-main review-wrap"><article class="review-article"><p class="eyebrow">${esc(item.program)} · ${esc(item.broadcastDate)}</p><h1>${esc(item.title)}</h1><p class="review-meta">방송일: ${esc(item.broadcastDate)} · 공식 영상과 요약 자료를 바탕으로 작성</p><nav class="review-note" aria-label="목차"><strong>목차</strong><ol><li><a href="#summary">방송 핵심 내용</a></li><li><a href="#detail">주요 내용</a></li><li><a href="#tvut">티벗 참여 방법</a></li></ol></nav><p class="review-intro">${esc(item.summary.slice(0,260))}</p><div class="review-ad" aria-label="광고">광고</div><section id="summary"><h2>방송 핵심 내용</h2><p>${esc(item.summary.slice(0,700))}</p></section><section id="detail"><h2>주요 내용 자세히 보기</h2>${body}</section><section id="tvut"><h2>티벗 참여 방법</h2><p>티벗 앱을 최신 상태로 설치하고 로그인한 뒤, 방송 중 표시되는 참여 화면을 확인하세요. 참여 조건과 발표 방식은 회차별 공식 안내를 기준으로 확인해야 합니다.</p></section><div class="review-actions"><a class="review-button" href="${esc(item.officialUrl)}" target="_blank" rel="noopener">공식 KBS 페이지</a><a class="review-button secondary" href="${esc(item.videoUrl)}" target="_blank" rel="noopener">공식 영상 보기</a></div><div class="review-note">이 글은 공식 방송 정보를 바탕으로 작성한 요약·해설이며 KBS 또는 티벗 공식 사이트가 아닙니다. 방송 대본·자막을 그대로 제공하지 않습니다.</div></article></main><footer class="review-footer"><div class="review-wrap"><a href="/review/">방송 리뷰 허브로 돌아가기</a></div></footer></body></html>`;
const outDir = path.join('content', 'generated-reviews');
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `${slug}-${item.broadcastDate}.html`);
await fs.writeFile(outPath, html, 'utf8');
console.log(`Generated ${outPath}`);

