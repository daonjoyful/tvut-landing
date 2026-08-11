import fs from 'node:fs/promises';

const [,, inputPath, metadataPath] = process.argv;
if (!inputPath || !metadataPath) throw new Error('Usage: node scripts/import-youtube-transcript.mjs transcript.txt metadata.json');
const transcript = (await fs.readFile(inputPath, 'utf8')).trim();
const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
if (transcript.length < 1000) throw new Error('Transcript is too short');
for (const key of ['program','broadcastDate','title','officialUrl','videoUrl']) if (!metadata[key]) throw new Error(`Missing metadata: ${key}`);
const out = { ...metadata, transcript, summary: transcript.slice(0, 500), sourceType: 'youtube-transcript-extension', sourceStatus: 'transcript-extracted' };
const outPath = `content/review-inbox/transcript-${metadata.program}-${metadata.broadcastDate}.json`;
await fs.writeFile(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`Imported ${outPath}`);