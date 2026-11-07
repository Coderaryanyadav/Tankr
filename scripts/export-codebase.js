const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outputFile = path.join(root, '11 - Tankr_FULL_CODEBASE.txt');

const ignoreDirs = new Set(['node_modules', '.git', '.expo', 'dist', '.gemini', 'tmp']);
const ignoreFiles = new Set([
  '11 - Tankr_FULL_CODEBASE.txt',
  'package-lock.json',
  '.DS_Store',
  '.env',
  '.env.local',
  '.env.production',
]);
const ignoreExts = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.ttf',
  '.woff',
  '.woff2',
  '.mp4',
  '.pdf',
  '.log',
  '.sqlite',
  '.sqlite3',
  '.db',
]);

const files = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (
        !ignoreFiles.has(entry.name) &&
        !ignoreExts.has(ext) &&
        !entry.name.endsWith('.log') &&
        !entry.name.startsWith('.env.') &&
        entry.name !== '.env'
      ) {
        files.push(relPath);
      } else if (entry.name === '.env.example') {
        files.push(relPath);
      }
    }
  }
}

walk(root);
files.sort();

console.log(`Writing ${files.length} files to ${outputFile}...`);

const stream = fs.createWriteStream(outputFile, { encoding: 'utf8' });

stream.write('TANKR COMPLETE CODEBASE EXPORT\n');
stream.write('Project: 11 - Tankr\n');
stream.write(`Files included: ${files.length}\n`);
stream.write('====================================================================================================\n\n');

for (const relPath of files) {
  const fullPath = path.join(root, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  stream.write('====================================================================================================\n');
  stream.write(`FILE: ${relPath}\n`);
  stream.write('====================================================================================================\n\n');
  stream.write(content);
  stream.write('\n\n');
}

stream.end(() => {
  console.log(`Export complete: ${files.length} files written to 11 - Tankr_FULL_CODEBASE.txt`);
});

