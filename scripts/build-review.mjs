Exit code: 0
Wall time: 0.7 seconds
Output:
import fs from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/build-review.mjs content/review-inbox/input.json');
const item = JSON.parse(await fs.readFile(inputPath, 'utf8'));
for (const key of ['program', 'broadcastDate', 'title', 'summary', 'officialUrl', 'videoUrl']) {
  if (!item[key]) throw new Error(`Missing required field: ${key}`);
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const slug = { '?꾩묠留덈떦':'amplaza', '2TV ?앹깮?뺣낫':'reallive', '臾댁뾿?대뱺 臾쇱뼱蹂댁꽭??:'whatever' }[item.program] ?? 'other';
const paragraphs = String(item.summary).split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
const body = paragraphs.map((p, i) => `<h2>${i === 0 ? '?ㅻ뒛 諛⑹넚 ?듭떖 ?댁슜' : `二쇱슂 ?댁슜 ${i}`}</h2><p>${esc(p)}</p>`).join('');
const intro = paragraphs[0] ?? item.title;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(item.title)}</title><meta name="description" content="${esc(intro.slice(0,150))}"><link rel="canonical" href="https://tvut.3678dairy.com/review/${slug}/${item.broadcastDate}/"><link rel="stylesheet" href="../../../review.css"></head><body><header class="review-header"><div class="review-wrap review-header-inner"><a class="review-brand" href="/">?곕쿁 ?댁쫰 ?덈궡</a><nav class="review-nav"><a href="/review/">?꾩껜 由щ럭</a><a href="/review/${slug}/">${esc(item.program)} ?덈궡</a></nav></div></header><main class="review-main review-wrap"><article class="review-article"><p class="eyebrow">${esc(item.program)} 쨌 ${esc(item.broadcastDate)}</p><h1>${esc(item.title)}</h1><p class="review-meta">諛⑹넚??${esc(item.broadcastDate)} 쨌 怨듭떇 ?곸긽怨?怨듦컻 ?ㅻ챸??諛뷀깢?쇰줈 ?묒꽦</p><nav class="review-note" aria-label="紐⑹감"><strong>紐⑹감</strong><ol><li><a href="#summary">諛⑹넚 ?듭떖 ?댁슜</a></li><li><a href="#guide">?쒖껌?먭? ?뺤씤????/a></li><li><a href="#tvut">?곕쿁 李몄뿬 ?덈궡</a></li></ol></nav><p class="review-intro">${esc(intro)}</p><div class="review-ad" aria-label="愿묎퀬">愿묎퀬</div><section id="summary">${body}</section><section id="guide"><h2>?쒖껌?먭? ?뺤씤????/h2><p>諛⑹넚 ?댁슜? ?뚯감? 諛⑹넚 ?쒖젏???곕씪 ?щ씪吏????덉뒿?덈떎. ?몃? ?댁슜? 怨듭떇 KBS ?곸긽怨??꾨줈洹몃옩 ?섏씠吏?먯꽌 ?뺤씤?섎뒗 寃껋씠 媛???뺥솗?⑸땲??</p></section><section id="tvut"><h2>?곕쿁 李몄뿬 ?덈궡</h2><p>?곕쿁 ?깆쓣 ?ㅼ튂?섍퀬 濡쒓렇?명븯硫?諛⑹넚蹂?李몄뿬 ?붾㈃怨??대깽?몃? ?뺤씤?????덉뒿?덈떎. 李몄뿬 議곌굔怨?諛쒗몴 諛⑹떇? 諛⑹넚 以??덈궡? 怨듭떇 怨듭?瑜?湲곗??쇰줈 ?뺤씤?섏꽭??</p></section><div class="review-actions"><a class="review-button" href="${esc(item.officialUrl)}" target="_blank" rel="noopener">怨듭떇 KBS ?섏씠吏</a><a class="review-button secondary" href="${esc(item.videoUrl)}" target="_blank" rel="noopener">怨듭떇 ?곸긽 蹂닿린</a></div><div class="review-note">??湲? 怨듭떇 諛⑹넚 ?뺣낫瑜?諛뷀깢?쇰줈 ?묒꽦??鍮꾧났???뺣낫 ?덈궡?낅땲?? 諛⑹넚 ?蹂맞룹옄留됱쓣 洹몃?濡?蹂듭궗?섏? ?딆븯?쇰ŉ, ?뺥솗???댁슜? 怨듭떇 KBS ?섏씠吏?먯꽌 ?뺤씤?섏꽭??</div></article></main><footer class="review-footer"><div class="review-wrap"><a href="/review/">諛⑹넚 由щ럭 ?덈툕濡??뚯븘媛湲?/a></div></footer></body></html>`;
const outDir = path.join('content', 'generated-reviews');
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `${slug}-${item.broadcastDate}.html`);
await fs.writeFile(outPath, html, 'utf8');
console.log(`Generated ${outPath}`);

