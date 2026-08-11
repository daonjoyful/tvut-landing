import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/summarize-review.mjs input.json');
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for automatic review writing');

const item = JSON.parse(await fs.readFile(file, 'utf8'));
const prompt = `Write an original Korean broadcast review from the transcript below. Never copy dialogue verbatim. Do not invent names, locations, prices, medical claims, or facts that are not supported by the transcript. The review must be useful to readers aged 65 and older. Return only JSON with this shape: {"intro":"2 short paragraphs separated by a blank line","sections":[{"heading":"a concise factual topic heading","paragraphs":["one paragraph of 3-4 lines","another paragraph of 3-4 lines"]}],"audiencePoint":"one practical viewing point"}. Create 2 to 5 sections. Each heading must summarize the section topic, not use labels like '주요 내용 1'. Keep the tone factual and readable.

Program: ${item.program}
Broadcast date: ${item.broadcastDate}
Transcript:
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
