import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const programs = {amplaza: '아침마당', reallive: '생생정보', whatever: '무엇이든 물어보세요', sixhour: '6시 내고향'};
const entries = [];
for (const [slug, program] of Object.entries(programs)) {
  const folder = path.join(root, 'review', slug);
  const subfolders = await fs.readdir(folder, {withFileTypes: true});
  const dates = subfolders.filter(item => item.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(item.name));
  for (const date of ['', ...dates.map(item => item.name).sort().reverse()]) {
    const html = await fs.readFile(path.join(folder, date, 'index.html'), 'utf8');
    const sourceTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const title = sourceTitle && sourceTitle.includes(program) ? sourceTitle : [program, date, '방송 안내'].filter(Boolean).join(' ');
    entries.push({program, date, title, url: '/review/' + slug + '/' + (date ? date + '/' : '')});
  }
}
await fs.mkdir(path.join(root, 'functions', 'admin'), {recursive:true});
await fs.writeFile(path.join(root, 'functions', 'admin', 'catalog.json'), JSON.stringify(entries, null, 2) + '\n');
