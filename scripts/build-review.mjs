import fs from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/build-review.mjs content/review-inbox/input.json');
const item = JSON.parse(await fs.readFile(inputPath, 'utf8'));
for (const key of ['program', 'broadcastDate', 'title', 'summary', 'transcript', 'officialUrl', 'videoUrl']) {
  if (!item[key]) throw new Error(`Missing required field: ${key}`);
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const programConfig = {
  '아침마당': { slug: 'amplaza', headings: ['출연자와 방송 주제 정리', '방송에서 소개된 구체적인 이야기', '출연자별 근황과 대화 흐름', '시청자가 기억할 방송 포인트'] },
  '2TV 생생정보': { slug: 'reallive', headings: ['오늘 소개된 장소와 핵심 정보', '방송에서 확인한 이용 정보', '생활에 참고할 내용', '시청자가 확인할 점'] },
  '무엇이든 물어보세요': { slug: 'whatever', headings: ['오늘의 주제와 전문가 설명', '방송에서 제시한 실천 방법', '시청자가 주의할 내용', '생활에 적용하는 방법'] }
};
const config = programConfig[item.program] ?? { slug: 'other', headings: ['방송 주제와 출연자 이야기', '방송에서 다룬 구체적인 내용', '시청자가 확인할 정보', '방송 내용 정리'] };
const generatedParagraphs = Array.isArray(item.generatedSections) ? item.generatedSections.flatMap(section => section.paragraphs ?? []) : [];
const transcriptParagraphs = generatedParagraphs.length ? generatedParagraphs : String(item.transcript).split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
if (transcriptParagraphs.length < 3) throw new Error('Transcript is too short for a review');
const sourceParagraphs = transcriptParagraphs.slice(0, 8);
const intro = item.generatedIntro || sourceParagraphs[0];
const sections = Array.isArray(item.generatedSections) && item.generatedSections.length ? item.generatedSections : config.headings.map((heading, index) => ({ heading, paragraphs: sourceParagraphs.slice(index * 2, index * 2 + 2) })).filter(section => section.paragraphs.length);
const sectionHtml = sections.map((section, index) => `<section id="summary-${index + 1}"><h2>${esc(section.heading)}</h2>${section.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</section>`).join('');
const toc = sections.map((section, index) => `<li><a href="#summary-${index + 1}">${esc(section.heading)}</a></li>`).join('');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(item.title)}</title><meta name="description" content="${esc(intro.slice(0, 150))}"><link rel="canonical" href="https://tvut.3678dairy.com/review/${config.slug}/${item.broadcastDate}/"><link rel="stylesheet" href="../../../review.css"></head><body><header class="review-header"><div class="review-wrap review-header-inner"><a class="review-brand" href="/">티벗 퀴즈 안내</a><nav class="review-nav"><a href="/review/">전체 리뷰</a><a href="/review/${config.slug}/">${esc(item.program)} 안내</a></nav></div></header><main class="review-main review-wrap"><article class="review-article"><p class="eyebrow">${esc(item.program)} · ${esc(item.broadcastDate)}</p><h1>${esc(item.title)}</h1><p class="review-meta">방송일 ${esc(item.broadcastDate)} · 공식 자막을 바탕으로 작성</p><nav class="review-note" aria-label="목차"><strong>목차</strong><ol>${toc}<li><a href="#guide">방송 내용 확인 방법</a></li><li><a href="#tvut">티벗 앱과 방송 참여 방법</a></li></ol></nav><p class="review-intro">${esc(intro)}</p><div class="review-ad" aria-label="광고">광고</div>${sectionHtml}<section id="guide"><h2>방송 내용 확인 방법</h2><p>방송 내용은 회차와 방송 시점에 따라 달라질 수 있습니다. 세부 내용은 공식 KBS 영상과 프로그램 페이지에서 확인하는 것이 가장 정확합니다.</p></section><section id="tvut"><h2>티벗 앱과 방송 참여 방법</h2><p>티벗 참여를 원하는 시청자는 앱을 최신 상태로 설치하고 로그인한 뒤 방송 중 화면에 표시되는 참여 메뉴를 확인하면 됩니다. 참여 방식과 퀴즈 내용, 발표 기준은 회차별로 달라질 수 있으므로 방송 중 안내와 공식 공지를 기준으로 확인하세요.</p></section><div class="review-actions"><a class="review-button" href="${esc(item.officialUrl)}" target="_blank" rel="noopener">공식 KBS 페이지</a><a class="review-button guide" href="https://as.daonenjoy.com/2025/02/kbs.html" target="_blank" rel="noopener">KBS 방송 다시보기·티벗 안내</a></div><div class="review-note">이 글은 공식 방송 정보를 바탕으로 작성한 비공식 정보 안내입니다. 방송 대본·자막을 그대로 복사하지 않았으며, 정확한 내용은 공식 KBS 페이지에서 확인하세요.</div></article></main><footer class="review-footer"><div class="review-wrap"><a href="/review/">방송 리뷰 허브로 돌아가기</a></div></footer></body></html>`;
const outDir = path.join('review', config.slug, item.broadcastDate);
await fs.mkdir(outDir, { recursive: true });
const finalHtml = html.replace('</head>', '<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token":"bc827face37c4c36a98765017f3c8b62"}\'></script></head>')
  .replace(/<footer class="review-footer">[\s\S]*?<\/footer>/, '<section class="review-disclaimer-band"><div class="review-wrap review-disclaimer"><strong>안내</strong><p>이 사이트는 KBS 또는 티벗의 공식 사이트가 아니며, 티벗 앱과 방송 참여 방법을 안내하는 정보 제공 목적의 페이지입니다. 방송 일정·참여 방법·이벤트·경품 정보는 공식 방송 및 앱 공지를 기준으로 확인해 주세요.</p><p><span class="footer-badge">▣ TV 및 프로그램</span></p><p>KBS 및 티벗 관련 상표와 콘텐츠의 권리는 각 권리자에게 있어요.</p></div></section><footer class="review-footer"><div class="review-wrap review-footer-info"><div class="review-footer-business"><strong>일상팔레트</strong><p>티벗 퀴즈 이용 방법 안내 페이지</p></div><div class="review-footer-business"><p>상호명: 일상팔레트 · 대표자: 최선봉</p><p>사업자등록번호: 329-02-01980</p><p>경기도 용인시 수지구 호수로24번길 27 (고기동)</p></div><div class="review-footer-business"><small>© 2025 일상팔레트. All rights reserved.</small></div></div></footer>')
  .replace(/합니다/g, '해요')
  .replace(/하세요/g, '해요')
  .replace(/있습니다/g, '있어요')
  .replace(/됩니다/g, '돼요')
  .replace(/<a class="review-button" href="[^"]*"[^>]*>[^<]*<\/a>/, '<a class="review-button content" href="/" rel="noopener">복지·건강·생활정보 보기</a>')
  .replace('<article class="review-article">', `<article class="review-article ${config.slug}">`)
  .replace('</h1>', '</h1><img class="review-cover" src="../../../assets/review-reallive.svg" alt="2TV 생생정보 방송 리뷰 대표 이미지">')
  .replace(/ · 공식 자막을 바탕으로 작성/g, '')
  .replace(/>공식 KBS 페이지</g, '>방송 정보 안내<')
  .replace(/<div class="review-note">이 글은 공식 방송 정보를 바탕으로 작성한 비공식 정보 안내입니다\.[\s\S]*?<\/div>/g, '');
await fs.writeFile(path.join(outDir, 'index.html'), finalHtml, 'utf8');
console.log(`Generated ${path.join(outDir, 'index.html')}`);
