import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const questionsDir = path.join(root, 'questions');
const outputFile = path.join(root, 'data', 'tests.json');
const DISPLAY_ORDER = new Map([
  ['cardiology.json', { title: 'Cardiology', order: 1 }],
  ['endocrinology.json', { title: 'Endocrinology', order: 2 }],
  ['gastroinstestinal.json', { title: 'Gastroinstestinal', order: 3 }],
  ['gynaecology.json', { title: 'Gynaecology', order: 4 }],
  ['mental-health.json', { title: 'Mental Health', order: 5 }],
  ['mental health.json', { title: 'Mental Health', order: 5 }],
  ['musculoskeletal.json', { title: 'Musculoskeletal', order: 6 }],
  ['neurology.json', { title: 'Neurology', order: 7 }],
  ['pediatrics.json', { title: 'Pediatrics', order: 8 }],
  ['renal-reproductive.json', { title: 'Renal Reproductive', order: 9 }],
  ['renal⁄reproductive.json', { title: 'Renal Reproductive', order: 9 }],
  ['respiratory.json', { title: 'Respiratory', order: 10 }],
  ['final1.json', { title: 'Final1', order: 11 }],
  ['final2.json', { title: 'Final2', order: 12 }],
  ['final3.json', { title: 'Final3', order: 13 }],
  ['final4.json', { title: 'Final4', order: 14 }],
  ['final5.json', { title: 'Final5', order: 15 }],
  ['final6.json', { title: 'Final6', order: 16 }],
  ['final7.json', { title: 'Final7', order: 17 }],
  ['final8.json', { title: 'Final8', order: 18 }],
  ['final9.json', { title: 'Final9', order: 19 }],
  ['final10.json', { title: 'Final10', order: 20 }],
]);


function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `test-${Date.now()}`;
}

function titleFromFile(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function topValues(list, key, limit = 3) {
  const counts = new Map();
  for (const item of list) {
    const value = item?.[key];
    if (!value || String(value).toLowerCase() === 'null') continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value]) => String(value));
}

async function readQuestionCount(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const trimmed = content.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return { count: 0, tags: [] };
    const parsed = JSON.parse(trimmed);
    const list = parsed.questionList || parsed.questions || parsed.items || parsed.data || (Array.isArray(parsed) ? parsed : []);
    if (!Array.isArray(list)) return { count: 0, tags: [] };
    const tags = [...new Set([...topValues(list, 'system'), ...topValues(list, 'subject'), ...topValues(list, 'topic')])].slice(0, 5);
    return { count: list.length, tags };
  } catch {
    return { count: 0, tags: [] };
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(json|txt)$/i.test(entry.name)) files.push(full);
  }
  return files;
}

await fs.mkdir(path.dirname(outputFile), { recursive: true });
const files = await walk(questionsDir).catch(() => []);
const tests = [];

for (const filePath of files.sort((a, b) => {
  const aMeta = DISPLAY_ORDER.get(path.basename(a).toLowerCase());
  const bMeta = DISPLAY_ORDER.get(path.basename(b).toLowerCase());
  const aOrder = aMeta?.order ?? 9999;
  const bOrder = bMeta?.order ?? 9999;
  return aOrder - bOrder || a.localeCompare(b);
})) {
  const relative = path.relative(root, filePath).split(path.sep).join('/');
  const fileName = path.basename(filePath);
  const ext = fileName.split('.').pop().toLowerCase();
  const displayMeta = DISPLAY_ORDER.get(fileName.toLowerCase());
  const meta = await readQuestionCount(filePath);
  tests.push({
    id: slugify(relative),
    title: displayMeta?.title || titleFromFile(fileName),
    file: relative,
    format: ext,
    order: displayMeta?.order ?? tests.length + 1,
    questions: meta.count,
    description: meta.count ? `${meta.count} questions` : 'Question file',
    tags: meta.tags.length ? meta.tags : [ext.toUpperCase()]
  });
}

await fs.writeFile(outputFile, `${JSON.stringify(tests, null, 2)}\n`);
console.log(`Wrote ${tests.length} test(s) to ${path.relative(root, outputFile)}`);
