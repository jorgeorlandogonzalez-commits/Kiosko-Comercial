const fs = require('fs');
let code = fs.readFileSync('components/PricingModal.tsx.tsx', 'utf8');
code = code.replace(/    } catch \(error\) \{\n      console\.error\("Error al iniciar trial:", error\);\n      alert\("Error de red al activar el periodo de prueba gratis\."\);\n    \/\/ Aquí integrarías/g, "    } catch (error) {\n      console.error(\"Error al iniciar trial:\", error);\n      alert(\"Error de red al activar el periodo de prueba gratis.\");\n    }\n    // Aquí integrarías");
fs.writeFileSync('components/PricingModal.tsx.tsx', code);
