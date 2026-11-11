import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/summarize-review.mjs input.json');
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for automatic review writing');

const item = JSON.parse(await fs.readFile(file, 'utf8'));
// Optionally use the authenticated administrator's downloaded guide.
const guide = await fs.readFile(process.argv[3] || new URL('./tvut-writing-guide.txt', import.meta.url), 'utf8');
const prompt = `${guide}

출력은 JSON 객체만 사용한다. 기존 페이지 생성기와의 호환을 위해 다음 필드를 사용한다:
{"intro":"도입문", "sections":[{"heading":"소제목", "paragraphs":["문단"]}], "audiencePoint":"독자가 확인할 다음 행동"}.
최소 두 개의 내용을 담은 sections를 사용한다. 실제 HTML이나 버튼 URL을 생성하지 않는다. 자료에 없는 내용은 추정하지 않는다.

프로그램: ${item.program}
방송일: ${item.broadcastDate}
제목: ${item.title || ''}
방송 자료:
${item.transcript}`;

let response;
for (let attempt = 1; attempt <= 3; attempt++) {
  response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4.1-mini', input: prompt, text: { format: { type: 'json_object' } } })
  });
  if (response.ok || ![500, 502, 503, 504].includes(response.status)) break;
  await new Promise(resolve => setTimeout(resolve, attempt * 5000));
}
if (!response.ok) throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
const data = await response.json();
const text = data.output?.flatMap(x => x.content ?? []).find(x => x.type === 'output_text')?.text ?? '';
const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());
if (!parsed.intro || !Array.isArray(parsed.sections) || parsed.sections.length < 2) throw new Error('AI summary structure is invalid');
if (parsed.sections.some(section => !section.heading || !Array.isArray(section.paragraphs) || section.paragraphs.length < 1)) throw new Error('AI section structure is invalid');
const generatedSummary = [parsed.intro, ...parsed.sections.flatMap(section => section.paragraphs ?? []), parsed.audiencePoint ?? ''].join('\n\n');
const out = { ...item, generatedIntro: parsed.intro, generatedSections: parsed.sections, audiencePoint: parsed.audiencePoint ?? '', summary: generatedSummary };
await fs.writeFile(file, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`AI summary generated: ${file}`);
