import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const presetTs = require('next/dist/compiled/babel/preset-typescript');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bloubDir = path.resolve(__dirname, '../lib/bloub');

const files = fs.readdirSync(bloubDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(bloubDir, file);
  const code = fs.readFileSync(filePath, 'utf-8');
  
  const result = babel.transformSync(code, {
    filename: file,
    presets: [[presetTs, { isTSX: false, allExtensions: true }]],
    configFile: false,
    babelrc: false,
  });

  const outName = file.replace(/\.ts$/, '.js');
  const outPath = path.join(bloubDir, outName);
  fs.writeFileSync(outPath, result.code, 'utf-8');
  console.log(`Transpiled ${file} -> ${outName}`);
}

console.log('All bloub files successfully transpiled to JS!');
