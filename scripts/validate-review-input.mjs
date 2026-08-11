import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/validate-review-input.mjs input.json');
const item = JSON.parse(await fs.readFile(file, 'utf8'));
const errors = [];
if (!item.title || item.title.length < 20 || item.title.length > 100) errors.push('title length');
if (!/^20\d{2}-\d{2}-\d{2}$/.test(item.broadcastDate ?? '')) errors.push('broadcastDate');
if (!item.officialUrl?.startsWith('https://program.kbs.co.kr/')) errors.push('officialUrl');
if (!item.videoUrl?.startsWith('https://www.youtube.com/')) errors.push('videoUrl');
const transcriptMinimum = item.program === '\u0032TV \uc0dd\uc0dd\uc815\ubcf4' ? 900 : 1000;
if ((item.transcript ?? '').length < transcriptMinimum) errors.push(`transcript too short (minimum ${transcriptMinimum})`);
if ((item.summary ?? '').length < 300) errors.push('summary too short');
const forbidden = ['공식 영상 자막을 바탕으로 작성', '공식 영상과 공개 설명을 바탕으로 작성', '이 글은 공식 방송 정보를 바탕으로 작성한 비공식 정보 안내입니다'];
for (const phrase of forbidden) if (`${item.title} ${item.summary} ${item.transcript}`.includes(phrase)) errors.push(`forbidden phrase: ${phrase}`);
if (!item.sourceStatus?.includes('transcript')) errors.push('unverified source');
if (errors.length) { console.error(`Review rejected: ${file}\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Review passed: ${file}`);
