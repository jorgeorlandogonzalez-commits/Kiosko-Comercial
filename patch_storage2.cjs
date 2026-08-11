const fs = require('fs');
let content = fs.readFileSync('services/storageService.ts', 'utf8');

// Add to KEYS
if (!content.includes('WITHHOLDINGS: \'kiosko_withholdings\'')) {
  content = content.replace("EXPENSES: 'kiosko_expenses',", "EXPENSES: 'kiosko_expenses',\n  WITHHOLDINGS: 'kiosko_withholdings',");
}

// Add default
if (!content.includes('INITIAL_WITHHOLDINGS')) {
  content = content.replace("const INITIAL_CATEGORIES", "const INITIAL_WITHHOLDINGS: Withholding[] = [\n  { id: '1', name: 'ReteFuente Compras (2.5%)', type: 'ReteFuente', percentage: 2.5, isActive: true },\n  { id: '2', name: 'ReteICA (0.414%)', type: 'ReteICA', percentage: 0.414, isActive: true }\n];\nconst INITIAL_CATEGORIES");
}

// Add sync
if (!content.includes("syncArrayDocument<Withholding>(userId, 'withholdings'")) {
  content = content.replace("syncArrayDocument<string>(userId, 'categories', KEYS.CATEGORIES, onUpdate)", "syncArrayDocument<string>(userId, 'categories', KEYS.CATEGORIES, onUpdate),\n    syncArrayDocument<Withholding>(userId, 'withholdings', KEYS.WITHHOLDINGS, onUpdate)");
}

// Add getters and setters
const withFuncs = `
export const getWithholdings = (): Withholding[] => getFromStorage<Withholding>(KEYS.WITHHOLDINGS, INITIAL_WITHHOLDINGS);
export const saveWithholdings = (withholdings: Withholding[]): void => {
  saveToStorage(KEYS.WITHHOLDINGS, withholdings);
  if (currentUserId) saveArrayToFirestore(currentUserId, 'withholdings', withholdings);
};
`;

if (!content.includes('getWithholdings')) {
  content += withFuncs;
}

fs.writeFileSync('services/storageService.ts', content);
