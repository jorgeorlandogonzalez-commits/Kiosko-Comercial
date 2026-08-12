const fs = require('fs');
let file = fs.readFileSync('ONBOARDING.md', 'utf8');

// Patch A
const targetA = '   - ¡Listo para subir a Kiosko Comercial!';
const patchA = `
### 🔒 ¿Dónde guardamos tu certificado?

Tu archivo .p12 se almacena **cifrado y protegido** en servidores seguros de Google Cloud (infraestructura certificada ISO 27001). 

- **Nadie en Kiosko Comercial** puede ver ni descargar tu certificado.
- Solo el sistema automatizado lo usa para firmar, y **solo cuando tú** presionas el botón "Emitir factura".
- Puedes **eliminar tu certificado en cualquier momento** desde Configuración → Certificado Digital → Eliminar permanentemente.
- Si cancelas tu suscripción, tus datos se eliminan permanentemente en 30 días (salvo facturas que la ley exige conservar por 5 años).

> 💡 **Transparencia total:** Lee nuestra [Política de Privacidad](/privacidad) y [Términos y Condiciones](/terminos) completos.
`;
file = file.replace(targetA, targetA + '\n' + patchA);

// Patch B
const targetB = 'Abajo a la derecha verás un botón con la cara de **Don J**, tu asistente contable.';
const patchB = 'Abajo a la derecha verás un botón con la cara de **Don J**, tu asistente inteligente para tu negocio.';
file = file.replace(targetB, patchB);

// Patch C
const targetC1 = '- **Usuarios:** Gestión de Multi-usuario y roles avanzados progresivamente habilitados en Plan EMPRESA (V3.2+).';
const targetC2 = '- **Usuarios:** Gestión de Multi-usuario y roles avanzados progresivamente habilitados en Plan EMPRESA (V3.3+).';
const patchC = `- **Usuarios:** Gestión de Multi-usuario y roles avanzados progresivamente habilitados en Plan EMPRESA (V3.3+).\n- **Planes CRECE y EMPRESA:** Disponibles en preventa/lista de espera. Contacta a soporte para más información.`;
if (file.includes(targetC1)) {
    file = file.replace(targetC1, patchC);
} else if (file.includes(targetC2)) {
    file = file.replace(targetC2, patchC);
}

// Patch D
const targetD = '📝 **Tu opinión nos ayuda a mejorar:**';
const patchD = `### 🛡️ Tus Datos Están Protegidos

Kiosko Comercial cumple con la **Ley 1581 de 2012** (Protección de Datos Personales de Colombia). Tienes derecho a:
- **Acceder** a tus datos personales
- **Rectificar** información incorrecta
- **Cancelar** tu cuenta y eliminar tus datos
- **Oponerte** al tratamiento de tus datos

Para ejercer estos derechos (ARCO), escríbenos a soporte@kioskocomercial.com con asunto "Derechos ARCO".

📝 **Tu opinión nos ayuda a mejorar:**`;
file = file.replace(targetD, patchD);

// Patch E
file = file.replace(/\[Tu número aquí\]/g, '+57 3247804513');
file = file.replace(/\[Tu número\]/g, '+57 3247804513');

fs.writeFileSync('ONBOARDING.md', file);
console.log('ONBOARDING.md patched.');
