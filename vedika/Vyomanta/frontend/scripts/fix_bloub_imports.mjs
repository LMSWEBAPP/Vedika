import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../lib/bloub');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const p = path.join(dir, file);
  let code = fs.readFileSync(p, 'utf-8');
  
  // Replace from './xyz' to from './xyz.js'
  code = code.replace(/from\s+['"](\.\/[^'"]+?)['"]/g, (match, imp) => {
    if (imp.endsWith('.js')) return match;
    return `from '${imp}.js'`;
  });

  // Replace from '@/bot/xyz' to from './xyz.js'
  code = code.replace(/from\s+['"]@\/bot\/([^'"]+?)['"]/g, (match, imp) => {
    const ext = imp.endsWith('.js') ? '' : '.js';
    return `from './${imp}${ext}'`;
  });

  fs.writeFileSync(p, code, 'utf-8');
}
console.log('Fixed relative imports in lib/bloub/*.js');
