const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `app.get("/api/health", (req, res) => {`;
const replacement = `app.get("/api/stats/public", async (req, res) => {
  try {
    const snap = await getFirestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15").doc("platform/stats").get();
    res.json({ facturasEmitidas: snap.exists ? (snap.data()?.facturasEmitidas ?? 0) : 0 });
  } catch (err) {
    res.json({ facturasEmitidas: 0 });
  }
});

app.get("/api/health", (req, res) => {`;

if (code.includes(target) && !code.includes('/api/stats/public')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts with /api/stats/public");
} else {
  console.log("Target not found or already patched in server.ts");
}
