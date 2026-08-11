const fs = require('fs');
let content = fs.readFileSync('components/Settings.tsx', 'utf8');

// Insert import
if (!content.includes('SettingsWithholdings')) {
  const importRegex = /import React.*?;/s;
  content = content.replace(importRegex, `import React, { useState, useEffect, useRef } from 'react';\nimport { SettingsWithholdings } from './SettingsWithholdings';`);
}

// Insert Component
if (!content.includes('<SettingsWithholdings />')) {
  const integrationTarget = `{/* Base de Datos Local */}`;
  content = content.replace(integrationTarget, `<SettingsWithholdings />\n      \n      {/* Base de Datos Local */}`);
}

fs.writeFileSync('components/Settings.tsx', content);
