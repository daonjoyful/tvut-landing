import fs from 'node:fs/promises';
const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/split-reallive-transcript.mjs transcript.json');
const item = JSON.parse(await fs.readFile(file, 'utf8'));
if (item.program !== '\u0032TV \uc0dd\uc0dd\uc815\ubcf4') { console.log(`Skip non-reallive: ${file}`); process.exit(0); }
const text = String(item.transcript ?? '').replace(/\r/g, ' ');
const cleanCaption = value => value.replace(/\[(?:음악|웃음|박수)\]/g, '').replace(/>>+/g, '').replace(/\s{2,}/g, ' ').trim();
const marks = [...text.matchAll(/(?:^|\s)(\d{2}):(\d{2}):(\d{2})\s+/g)];
let parts = [];
if (marks.length >= 2) {
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index + marks[i][0].length - 9;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    const seconds = Number(marks[i][1]) * 3600 + Number(marks[i][2]) * 60 + Number(marks[i][3]);
    parts.push({ seconds, text: text.slice(start, end).replace(/^\s*\d{2}:\d{2}:\d{2}\s*/, '').trim() });
  }
} else parts = text.split(/\n{2,}/).map(t => ({ seconds: 0, text: t.trim() })).filter(p => p.text);
const segments = [];
let current = { start: parts[0]?.seconds ?? 0, texts: [] };
for (const part of parts) {
  const gap = part.seconds - (current.last ?? part.seconds);
  if (current.texts.length && gap >= 75 && current.texts.join(' ').length >= 850) { segments.push(current); current = { start: part.seconds, texts: [] }; }
  current.texts.push(part.text); current.last = part.seconds;
}
if (current.texts.length) segments.push(current);
const usable = segments.filter(s => s.texts.join(' ').length >= 900);
if (usable.length <= 1) { console.log(`One usable segment: ${file}`); process.exit(0); }
const makeTitle = text => {
  if (/뇌경색|교통사고|병원|수술|회복/.test(text)) return '\uc0dd\uc0dd\uc815\ubcf4｜\ub1cc\uacbd\uc0c9\uacfc \uad50\ud1b5\uc0ac\uace0\ub97c \uc774\uaca8\ub0b4\uace0 \ub2e4\uc2dc \uc77c\uc5b4\uc120 \ud560\uba38\ub2c8\uc758 \uc0b6';
  if (/두부|보쌈|된장|김치|수육|가마솥|손맛/.test(text)) return '\uc0dd\uc0dd\uc815\ubcf4｜\ud560\uba38\ub2c8 \uc190\ub9db\uc73c\ub85c \uc774\uc5b4\uc628 \ub450\ubd80\uae40\uce58\ubcf4\uc30c\uacfc \uc6b0\ub801\ub41c\uc7a5\ucc0c\uac1c';
  if (/동네|친구|이웃|사랑방|심심/.test(text)) return '\uc0dd\uc0dd\uc815\ubcf4｜\uc2dd\ub2f9\uc744 \uc9c0\ucf1c\uc900 \ub3d9\ub124 \uc774\uc6c3\ub4e4\uc758 \ub530\ub73b\ud55c \uc774\uc57c\uae30';
  return '\uc0dd\uc0dd\uc815\ubcf4｜\uc624\ub79c \uc138\uc6d4 \ud55c\uc790\ub9ac\ub97c \uc9c0\ucf1c\uc628 \ud560\uba38\ub2c8 \uc2dd\ub2f9 \uc774\uc57c\uae30';
};
for (let i = 0; i < usable.length; i++) {
  const segmentText = cleanCaption(usable[i].texts.join('\n\n'));
  const segment = { ...item, title: makeTitle(segmentText), transcript: segmentText, summary: segmentText.slice(0, 900), segmentIndex: i + 1, segmentStartSeconds: usable[i].start, sourceStatus: 'transcript-extracted-segment' };
  const out = file.replace(/transcript-/, 'transcript-segment-').replace(/\.json$/, `-${String(i + 1).padStart(2, '0')}.json`);
  await fs.writeFile(out, JSON.stringify(segment, null, 2) + '\n', 'utf8');
  console.log(`Created ${out}`);
}
