import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(walk(full));
    } else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js') || full.endsWith('.jsx')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk('./src');
const hooks = ['useMemo', 'useState', 'useEffect', 'useCallback', 'useRef', 'useContext', 'useId', 'useTransition'];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const hook of hooks) {
    const usageRegex = new RegExp('\\b' + hook + '\\b');
    if (usageRegex.test(content)) {
      // Check if it's imported or qualified as React.xxx
      const reactImportRegex = new RegExp('import\\s+{[^}]*\\b' + hook + '\\b[^}]*}\\s+from\\s+[\'"]react[\'"]', 's');
      const directReactRegex = new RegExp('\\bReact\\.' + hook + '\\b');
      const starReactRegex = /import\s+\*\s+as\s+React\s+from\s+['"]react['"]/;
      const defaultReactRegex = /import\s+React\s+from\s+['"]react['"]/;
      
      const ok = reactImportRegex.test(content) || directReactRegex.test(content) || starReactRegex.test(content) || defaultReactRegex.test(content);
      if (!ok) {
        console.log(`[MISSING HOOK] ${hook} in ${file}`);
      }
    }
  }
}
console.log('Scan complete.');
