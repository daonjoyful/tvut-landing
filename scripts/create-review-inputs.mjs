Exit code: 0
Wall time: 0.7 seconds
Output:
import fs from 'node:fs/promises';

const sourcePath = process.argv[2] ?? 'kbs-review-candidates.json';
const payload = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const urls = {
  '?꾩묠留덈떦': 'https://program.kbs.co.kr/1tv/culture/amplaza/pc/index.html',
  '2TV ?앹깮?뺣낫': 'https://program.kbs.co.kr/2tv/culture/reallive/pc/index.html',
  '臾댁뾿?대뱺 臾쇱뼱蹂댁꽭??: 'https://program.kbs.co.kr/1tv/culture/whatever/pc/index.html'
};
const slugs = { '?꾩묠留덈떦': 'amplaza', '2TV ?앹깮?뺣낫': 'reallive', '臾댁뾿?대뱺 臾쇱뼱蹂댁꽭??: 'whatever' };
await fs.mkdir('content/review-inbox', { recursive: true });

for (const item of payload.candidates ?? []) {
  const description = (item.description ?? '').trim();
  const summary = [
    `${item.program} ${item.broadcastDate} 諛⑹넚 ?덈궡?낅땲??`,
    description || `${item.title}? 愿?⑤맂 怨듭떇 ?곸긽怨??꾨줈洹몃옩 ?뺣낫瑜??뺤씤?????덉뒿?덈떎.`,
    '??湲? 怨듭떇 ?곸긽 ?쒕ぉ怨?怨듦컻 ?ㅻ챸??諛뷀깢?쇰줈 ?묒꽦???뺣낫 ?덈궡?낅땲?? ?먯꽭??諛⑹넚 ?댁슜? 怨듭떇 KBS ?곸긽?먯꽌 ?뺤씤?섏꽭??',
    '?곕쿁 李몄뿬媛 ?덈궡???뚯감?쇰㈃ ?깆쓣 ?ㅼ튂?섍퀬 濡쒓렇?명븳 ??諛⑹넚 以??쒖떆?섎뒗 李몄뿬 ?붾㈃???뺤씤?????덉뒿?덈떎.'
  ].join('\n\n');
  const input = {
    program: item.program,
    broadcastDate: item.broadcastDate,
    title: item.title,
    summary,
    officialUrl: urls[item.program],
    videoUrl: item.url,
    sourceType: item.reviewReady ? 'official-youtube-description' : 'official-youtube-title-description',
    sourceStatus: item.reviewReady ? 'detailed-source' : 'limited-source'
  };
  const file = `content/review-inbox/auto-${slugs[item.program]}-${item.broadcastDate}.json`;
  await fs.writeFile(file, JSON.stringify(input, null, 2) + '\n', 'utf8');
  console.log(`Prepared ${file}`);
}

