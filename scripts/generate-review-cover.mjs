import fs from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/generate-review-cover.mjs input.json');
const item = JSON.parse(await fs.readFile(inputPath, 'utf8'));
for (const key of ['program','broadcastDate','title']) if (!item[key]) throw new Error(`Missing required field: ${key}`);

const base = {
  '아침마당': { slug:'amplaza', accent:'#f26b4f', dark:'#17325f', label:'아침마당' },
  '2TV 생생정보': { slug:'reallive', accent:'#159f9a', dark:'#124b67', label:'2TV 생생정보' },
  '무엇이든 물어보세요': { slug:'whatever', accent:'#8b57d8', dark:'#30205d', label:'무엇이든 물어보세요' }
}[item.program] ?? { slug:'other', accent:'#4574e8', dark:'#17325f', label:item.program };

const source = [item.title, item.summary ?? '', item.transcript ?? ''].join(' ').slice(0, 8000);
const themes = [
  { test:/결혼|부부|가족|배우자|신혼|자녀|부모|출연자/, accent:'#f26b4f', dark:'#17325f', themeLabel:'가족·관계' },
  { test:/건강|운동|혈압|혈당|질환|통증|의사|식단/, accent:'#159f9a', dark:'#124b67', themeLabel:'건강·생활' },
  { test:/복지|지원금|연금|기초연금|혜택|정책/, accent:'#e0a52b', dark:'#4c3b16', themeLabel:'복지·지원' },
  { test:/맛집|음식|식당|요리|시장|여행|장소/, accent:'#e77932', dark:'#5c2b13', themeLabel:'생활·맛집' },
  { test:/티벗|퀴즈|앱|설치|로그인|참여/, accent:'#6b5bd6', dark:'#241b5c', themeLabel:'티벗 참여' }
];
const theme = themes.find(x=>x.test.test(source)) ?? { accent:base.accent, dark:base.dark, themeLabel:'방송 이야기' };
const config = { ...base, accent:theme.accent, dark:theme.dark, themeLabel:theme.themeLabel };

const esc = v => String(v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const title = String(item.title).replace(/\\s*\\|.*$/, '').slice(0, 28);
const dateLabel = item.broadcastDate.replaceAll('-', '.');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="bg" x1="0" x2="1"><stop stop-color="#fffdf8"/><stop offset="1" stop-color="#eef3ff"/></linearGradient><linearGradient id="wave" x1="0" x2="1"><stop stop-color="${config.accent}"/><stop offset="1" stop-color="#f1bd45"/></linearGradient></defs><rect width="1200" height="675" rx="28" fill="url(#bg)"/><circle cx="1010" cy="125" r="150" fill="${config.accent}" opacity=".12"/><circle cx="1010" cy="125" r="105" fill="none" stroke="${config.accent}" stroke-width="5" opacity=".65"/><path d="M850 550c90-115 90-250 38-335 80 54 118 121 86 210 57-66 66-145 40-198 89 83 94 226-11 323H850Z" fill="${config.dark}"/><path d="m945 253 99-75M956 296l104-40" stroke="#edb238" stroke-width="12" stroke-linecap="round"/><path d="M0 552c175-79 278 38 436 0s275-37 404 5 244-15 360-63v181H0Z" fill="url(#wave)"/><path d="M0 570c175-79 278 38 436 0s275-37 404 5 244-15 360-63" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="7"/><g font-family="Arial,'Malgun Gothic',sans-serif" fill="${config.dark}"><text x="62" y="100" font-size="32" font-weight="700">${esc(config.label)}</text><text x="62" y="142" font-size="24" font-weight="700" fill="${config.accent}">${esc(config.themeLabel)}</text><text x="62" y="190" font-size="58" font-weight="800">${esc(title.slice(0,16))}</text><text x="62" y="260" font-size="58" font-weight="800">${esc(title.slice(16))}</text><rect x="62" y="310" width="280" height="52" rx="26" fill="${config.accent}"/><text x="92" y="345" font-size="24" fill="#fff" font-weight="700">${dateLabel} 방송 리뷰</text><text x="600" y="638" font-size="22" text-anchor="middle" fill="#536b91">${esc(config.label)} ${item.broadcastDate} 방송 리뷰</text></g></svg>`;

const out = path.join('assets','reviews',`${config.slug}-${item.broadcastDate}-cover.svg`);
await fs.mkdir(path.dirname(out), {recursive:true});
await fs.writeFile(out, svg, 'utf8');
console.log(`Generated ${out}`);