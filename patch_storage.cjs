const fs = require('fs');
let content = fs.readFileSync('services/storageService.ts', 'utf8');

const importRegex = /import \{([^}]+)\} from '\.\.\/types';/;
const match = content.match(importRegex);
if (match) {
    let imports = match[1];
    if (!imports.includes('Withholding')) {
        imports += ', Withholding';
        content = content.replace(importRegex, `import {${imports}} from '../types';`);
    }
}

const withH = `
const WITHHOLDINGS_KEY = 'kiosko_withholdings';

export const storageService = {
`;

if (!content.includes('kiosko_withholdings')) {
    content = content.replace('export const storageService = {', withH + `  
  getWithholdings: (): Withholding[] => {
    try {
      const data = localStorage.getItem(WITHHOLDINGS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveWithholdings: (withholdings: Withholding[]): void => {
    localStorage.setItem(WITHHOLDINGS_KEY, JSON.stringify(withholdings));
  },
`);
}

fs.writeFileSync('services/storageService.ts', content);
