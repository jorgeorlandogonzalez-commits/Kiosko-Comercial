const fs = require('fs');
let content = fs.readFileSync('services/firebaseSyncService.ts', 'utf8');

content = content.replace(
  /function handleFirestoreError\(error: unknown, operationType: OperationType, path: string \| null\) \{/,
  `function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error("🔥 FIRESTORE ERROR IN PATH:", path, "OPERATION:", operationType, "ERROR:", error);
  // We can also alert for better visibility if desired, but console is fine
`
);

fs.writeFileSync('services/firebaseSyncService.ts', content);
