// Run from the repository root with the bundled sharp package available.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const pages = [
  ['index.html', 'tvut-main-thumbnail', '티벗 앱 설치와 방송 퀴즈 참여 안내'],
  ['review/amplaza/index.html', 'review-amplaza', '아침마당 티벗 설치와 퀴즈 참여 안내'],
  ['review/reallive/index.html', 'review-reallive', '생생정보 티벗 설치와 깜짝퀴즈 참여 안내'],
  ['review/whatever/index.html', 'review-whatever', '무엇이든 물어보세요 티벗 질문·투표 참여 안내'],
];
(async () => {
  for (const [file, name, alt] of pages) {
    const source = fs.readFileSync(`assets/${name}.svg`, 'utf8')
      .replaceAll('font-family="sans-serif"', 'font-family="Malgun Gothic,sans-serif"');
    await sharp(Buffer.from(source)).resize(1200, 630).flatten({ background: '#ffffff' }).png().toFile(`assets/${name}.png`);
    let html = fs.readFileSync(file, 'utf8');
    html = html.replaceAll(`/assets/${name}.svg`, `/assets/${name}.png`);
    html = html.replace(/<meta property="og:image:(?:width|height|type)"[^>]*>/g, '');
    html = html.replace('</head>', '<meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head>');
    html = html.replace(/<meta name="twitter:card" content="summary">/, '<meta name="twitter:card" content="summary_large_image">');
    if (file === 'index.html') {
      const start = html.indexOf('      <a class="hero-card"');
      const end = html.indexOf('</a>', start) + 4;
      if (start < 0 || end < 4) throw new Error('Main hero not found');
      html = html.slice(0, start) + `      <a class="guide-image-link" href="https://m.site.naver.com/1Cc0k" target="_blank" rel="noopener" aria-label="티벗 설치 방법 보기"><img class="guide-main-image" src="/assets/${name}.png" alt="${alt}" width="1200" height="630" fetchpriority="high" decoding="async"></a>` + html.slice(end);
    } else {
      html = html.replace(new RegExp(`<img src="/assets/${name}\\.png"[^>]*>`), `<img src="/assets/${name}.png" alt="${alt}" width="1200" height="630" decoding="async">`);
    }
    fs.writeFileSync(file, html);
  }
  const css = '\n/* Page representative image, shared by the visible hero and Open Graph. */\n.guide-image-link{display:block;min-width:0;align-self:center}.guide-main-image{display:block;width:100%;height:auto;aspect-ratio:1200/630;border-radius:24px;background:#edf5ff}\n';
  const current = fs.readFileSync('styles.css', 'utf8');
  if (!current.includes('.guide-main-image{')) fs.appendFileSync('styles.css', css);
  console.log('Updated four guide images and their Open Graph metadata.');
})().catch(error => { console.error(error); process.exitCode = 1; });
