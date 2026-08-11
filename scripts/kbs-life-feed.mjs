const feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCHlSeJxRIXZWMARC2oMwmcQ';
const allowed = ['아침마당', '2TV 생생정보', '무엇이든 물어보세요'];
const maxAgeDays = 2;

const response = await fetch(feedUrl);
if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
const xml = await response.text();
const entries = [...xml.matchAll(/<entry>([\\s\\S]*?)<\\/entry>/g)].map(match => match[1]);
const clean = value => value
  .replace(/<!\\[CDATA\\[|\\]\\]>/g, '')
  .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .trim();
const tag = (entry, name) => clean(entry.match(new RegExp(`<${name}>([\\\\s\\\\S]*?)<\\\\/${name}>`))?.[1] ?? '');
const now = Date.now();

const candidates = entries.map(entry => {
  const title = tag(entry, 'title');
  const description = tag(entry, 'media:description');
  const published = tag(entry, 'published');
  const videoId = tag(entry, 'yt:videoId');
  const dateMatch = title.match(/KBS\\s+(\\d{2})(\\d{2})(\\d{2})\\s+방송/);
  const broadcastDate = dateMatch ? `20${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
  const ageDays = broadcastDate ? Math.floor((now - Date.parse(`${broadcastDate}T00:00:00+09:00`)) / 86400000) : null;
  const program = allowed.find(name => title.includes(name)) ?? null;
  const reviewReady = description.length >= 500;
  return {
    program, title, description, broadcastDate, ageDays, published, videoId,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    reviewReady, status: reviewReady ? 'candidate' : 'needs-source'
  };
}).filter(item => item.program && item.broadcastDate && item.ageDays >= 0 && item.ageDays <= maxAgeDays);

console.log(JSON.stringify({ source: feedUrl, collectedAt: new Date().toISOString(), candidates }, null, 2));
