const fs = require('fs');

// Patch LandingPage.tsx
let content = fs.readFileSync('components/LandingPage.tsx', 'utf8');

content = content.replace(
  'Horario de soporte:<br/>Lunes a Sábado, 8:00 AM - 6:00 PM (COL)',
  'Horario de soporte:<br/>Lunes a Viernes 8:00 AM - 5:00 PM · Sábados 8:00 AM - 12:00 M · Domingos y festivos no laboramos'
);

content = content.replace(
  'className="fixed bottom-6 right-6 z-50"',
  'className="fixed bottom-6 left-6 z-50"'
);

content = content.replace(
  'className="bg-gray-100 py-12 px-6 border-t border-gray-200"',
  'className="bg-gray-100 pt-12 pb-24 md:pb-28 px-6 border-t border-gray-200"'
);

fs.writeFileSync('components/LandingPage.tsx', content);

// Patch ONBOARDING.md
let onboarding = fs.readFileSync('ONBOARDING.md', 'utf8');

onboarding = onboarding.replace(
  '- 🕐 **Horario:** Lunes a Sábado, 8:00 AM - 6:00 PM (COL)',
  '- 🕐 **Horario:** Lunes a Viernes 8:00 AM - 5:00 PM · Sábados 8:00 AM - 12:00 M · Domingos y festivos no laboramos'
);

fs.writeFileSync('ONBOARDING.md', onboarding);

console.log("Patch completed");
