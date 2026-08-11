import fs from 'node:fs/promises';

const sourcePath = process.argv[2] ?? 'kbs-review-candidates.json';
const payload = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const urls = {
  '아침마당': 'https://program.kbs.co.kr/1tv/culture/amplaza/pc/index.html',
  '2TV 생생정보': 'https://program.kbs.co.kr/2tv/culture/reallive/pc/index.html',
  '무엇이든 물어보세요': 'https://program.kbs.co.kr/1tv/culture/whatever/pc/index.html'
};
const slugs = { '아침마당': 'amplaza', '2TV 생생정보': 'reallive', '무엇이든 물어보세요': 'whatever' };
await fs.mkdir('content/review-inbox', { recursive: true });

for (const item of payload.candidates ?? []) {
  const description = (item.description ?? '').trim();
  const summary = [
    `${item.program} ${item.broadcastDate} 방송 안내입니다.`,
    description || `${item.title}와 관련된 공식 영상과 프로그램 정보를 확인할 수 있습니다.`,
    '이 글은 공식 영상 제목과 공개 설명을 바탕으로 작성한 정보 안내입니다. 자세한 방송 내용은 공식 KBS 영상에서 확인하세요.',
    '티벗 참여가 안내된 회차라면 앱을 설치하고 로그인한 뒤 방송 중 표시되는 참여 화면을 확인할 수 있습니다.'
  ].join('\n\n');
  const input = {
    program: item.program,
    broadcastDate: item.broadcastDate,
    title: item.title,
    summary,
    transcript: item.transcript ?? '',
    officialUrl: urls[item.program],
    videoUrl: item.url,
    sourceType: item.reviewReady ? 'official-youtube-description' : 'official-youtube-title-description',
    sourceStatus: item.reviewReady ? 'detailed-source' : 'limited-source'
  };
  const file = `content/review-inbox/auto-${slugs[item.program]}-${item.broadcastDate}.json`;
  await fs.writeFile(file, JSON.stringify(input, null, 2) + '\n', 'utf8');
  console.log(`Prepared ${file}`);
}