const fs = require('fs');
let code = fs.readFileSync('MainApp.tsx', 'utf8');

// Add imports
const importsTarget = `import { TerminosPage } from './components/TerminosPage';`;
const importsReplacement = `import { TerminosPage } from './components/TerminosPage';
import { DemoPOS } from './components/DemoPOS';
import { TestimoniosPage } from './components/TestimoniosPage';`;

if (code.includes(importsTarget) && !code.includes('DemoPOS')) {
  code = code.replace(importsTarget, importsReplacement);
}

// Modify state initialization
const stateTarget = `const [currentExternalView, setCurrentExternalView] = useState<'LANDING' | 'HABILITADOR' | 'TERMINOS'>('LANDING');`;
const stateReplacement = `const [currentExternalView, setCurrentExternalView] = useState<'LANDING' | 'HABILITADOR' | 'TERMINOS' | 'DEMO' | 'TESTIMONIOS'>(() => {
    const path = window.location.pathname;
    if (path === '/demo') return 'DEMO';
    if (path === '/testimonios') return 'TESTIMONIOS';
    if (path === '/terminos') return 'TERMINOS';
    return 'LANDING';
  });`;

if (code.includes(stateTarget)) {
  code = code.replace(stateTarget, stateReplacement);
}

// Modify render
const renderTarget = `{currentExternalView === 'TERMINOS' && (
          <TerminosPage onBackToApp={() => setCurrentExternalView('LANDING')} />
        )}`;
const renderReplacement = `{currentExternalView === 'TERMINOS' && (
          <TerminosPage onBackToApp={() => setCurrentExternalView('LANDING')} />
        )}
        {currentExternalView === 'DEMO' && (
          <DemoPOS />
        )}
        {currentExternalView === 'TESTIMONIOS' && (
          <TestimoniosPage />
        )}`;

if (code.includes(renderTarget)) {
  code = code.replace(renderTarget, renderReplacement);
  fs.writeFileSync('MainApp.tsx', code);
  console.log("Patched MainApp.tsx");
} else {
  console.log("Target render block not found in MainApp.tsx");
}
