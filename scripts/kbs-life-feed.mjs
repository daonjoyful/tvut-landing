const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCHlSeJxRIXZWMARC2oMwmcQ';
const requestTimeoutMs = 15000;
const maxAttempts = 6;
const allowed = ['아침마당', '2TV 생생정보', '무엇이든 물어보세요'];
const standardAgeDays = 7;
const evergreenAgeDays = 14;
const evergreenTerms = ['건강', '복지', '지원금', '연금', '주거', '운동', '지방', '검진', '노후', '생활정보', '치료', '정책'];

let response;
let lastError = 'no response';
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    response = await fetch(feedUrl, {
      headers: { 'user-agent': 'tvut-review-bot/1.0' },
      signal: controller.signal,
    });
    if (response.ok) break;
    lastError = `HTTP ${response.status}`;
  } catch (error) {
    lastError = error.name === 'AbortError' ? `timeout after ${requestTimeoutMs}ms` : error.message;
  } finally {
    clearTimeout(timeout);
  }
  if (attempt < maxAttempts) {
    const delayMs = Math.min(15000, 2000 * 2 ** (attempt - 1));
    console.warn(`RSS request attempt ${attempt}/${maxAttempts} failed (${lastError}); retrying in ${delayMs}ms`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
if (!response?.ok) throw new Error(`RSS fetch failed after ${maxAttempts} attempts: ${lastError}`);

const xml = await response.text();
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(match => match[1]);
if (entries.length === 0) throw new Error('RSS response contained no video entries');
const clean = value => value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
const tag = (entry, name) => clean(entry.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? '');
const now = Date.now();

const candidates = entries.map(entry => {
  const title = tag(entry, 'title');
  const description = tag(entry, 'media:description');
  const published = tag(entry, 'published');
  const videoId = tag(entry, 'yt:videoId');
  const dateMatch = title.match(/KBS\s+(\d{2})(\d{2})(\d{2})\s+방송/);
  const broadcastDate = dateMatch ? `20${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
  const ageDays = broadcastDate ? Math.floor((now - Date.parse(`${broadcastDate}T00:00:00+09:00`)) / 86400000) : null;
  const program = allowed.find(name => title.includes(name)) ?? null;
  const evergreen = evergreenTerms.some(term => `${title} ${description}`.includes(term));
  const maxAgeDays = evergreen ? evergreenAgeDays : standardAgeDays;
  const reviewReady = description.length >= 500;
  return { program, title, description, broadcastDate, ageDays, published, videoId, url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null, reviewReady, evergreen, maxAgeDays, status: reviewReady ? 'candidate' : 'needs-source' };
}).filter(item => item.program && item.broadcastDate && item.ageDays >= 0 && item.ageDays <= item.maxAgeDays);

console.log(JSON.stringify({ source: feedUrl, collectedAt: new Date().toISOString(), candidates }, null, 2));
