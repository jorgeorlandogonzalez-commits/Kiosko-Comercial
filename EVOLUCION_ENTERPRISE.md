# 🚀 De Kiosko Comercial a Kiosko Comercial Enterprise
## Registro Oficial de Línea Base y Plan de Evolución ERP

Este documento recopila la **Línea Base Técnica Estable** de **Kiosko Comercial V3.0** como un hito cerrado, seguro y validado, y proyecta la hoja de ruta y la arquitectura requerida para su evolución a la versión **Enterprise** (ERP de Cobertura Latinoamericana).

---

## 📅 Sección 1: Registro del Estado Actual (Baseline Kiosko Comercial)

A fecha de hoy (**2026-05-30**), la plataforma se encuentra completamente funcional, optimizada y blindada contra fallos en producción. El software está diseñado bajo la filosofía **Offline-First**, garantizando que el comercio minorista nunca pare de vender incluso sin acceso a internet o en situaciones de latencia crítica.

### 1.1 Frentes Técnicos Validados y Cerrados
- **🔐 Seguridad de Datos y Sincronización Real:**
  - Se eliminó el uso de IDs simulados (como el antiguo `'1001'`).
  - Los Superusuarios (`info.msdmed@gmail.com` y `jorge.orlando.gonzalez@gmail.com`) operan bajo sus **UIDs reales de Firebase Auth**, integrando sincronización multi-instalación y multi-dispositivo sin interrupción.
  - El sistema mantiene el bypass administrativo otorgándoles trial ilimitado (999 días) y bloqueando advertencias de suscripción vencida.
- **☁️ Almacenamiento Criptográfico (Cloud Storage):**
  - **Certificados `.p12` reales** validados y almacenados bajo rutas privadas segregadas por usuario (`/users/{uid}/certificates/filename.p12`).
  - Reglas de acceso estrictas aplicadas para proteger dichos archivos de extracción de datos, restringiendo la subida y asegurando que solo el respectivo usuario autenticado y con un tamaño < 5MB pueda operar.
- **🧾 Transmisión DIAN Autorizada en Servidor:**
  - El cálculo del **CUFE legal** (con algoritmo SHA-384 nativo) y la **firma criptográfica del XML** ocurren bajo bloqueo defensivo de ambiente en el backend (`/backend/dianBackendHandlers.ts`).
  - Integrada verificación con esquemas de validación **Zod** en el cliente (`dianService.ts`) evitando envíos inválidos al servidor DIAN.
- **📢 Telemetría y Soporte Activos:**
  - Logs estructurados con `Pino` y conectividad con Cloud Logging.
  - Gestión centralizada de errores a través de un `ErrorBoundary` visual en React que captura las anomalías con elegancia (UX 50+).
  - Canales de asistencia interactivos y flujos de feedback pre-configurados.

---

## 🔄 Sección 2: La Última Adición de Transición
### 💡 Característica: Siguiente Consecutivo Continuo
Para dar paso a los clientes que se encuentran listos en la fila ("prospectos listos para arrancar"), incorporamos con éxito en el panel de **Configuración de Facturación** una herramienta clave: **"Siguiente Consecutivo"**.

*   **¿Cuál era el problema?** Cuando un cliente migra de Alegra, Siigo, Zoho u otro de software ERP, ya tiene una numeración de facturando en curso frente a la DIAN (por ejemplo, van en la factura `CO-5000`). No podían empezar desde el número `1` sin infringir la numeración autorizada.
*   **¿Cuál es la solución implementada?** Ahora en el panel de Configuración, los usuarios pueden ingresar de manera explícita el número con el que desean arrancar. 
    *   Si se completa el valor como `5001`, la siguiente venta generada por el POS tomará automáticamente el identificador `${Prefijo}-5001`.
    *   En las siguientes facturas, el motor incrementa la numeración progresivamente de manera transparente.
    *   **Resiliencia total:** No genera duplicaciones gracias al motor de persistencia reactivo de Firestore, y la actualización entra en vigor de forma instantánea de cara al usuario final sin requerir refresh ni descargas adicionales.

---

## 🛠️ Sección 3: Arquitectura Multitenant e Inmunidad en Despliegue para "Enterprise"

En el momento de cambiar el modelo de negocio masivo a un **ERP Enterprise Latinoamericano**, es imperativo estructurar los entornos para que el desarrollo de nuevas funciones de gran tamaño (módulos ERP) no interrumpa el sistema de producción estable que ya usan tus clientes activos.

### 3.1 Evitar Actualizaciones Automáticas No Deseadas
Cuando un desarrollador actualiza el código en la rama principal, el compilador actualiza el código del cliente. Para controlar este proceso e implementar un proceso de aprobación riguroso, establece el siguiente esquema:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │              Repositorio de Código (GitHub/VCS)         │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                      ┌────────────────────────┴────────────────────────┐
                      ▼                                                 ▼
      ┌────────────────────────────────┐                ┌────────────────────────────────┐
      │  Rama "develop" / Estructuras  │                │    Rama "main" / Estable       │
      └───────────────┬────────────────┘                └───────────────┬────────────────┘
                      │                                                 │
                      ▼                                                 ▼
      ┌────────────────────────────────┐                ┌────────────────────────────────┐
      │     ENTORNO DE DESARROLLO      │                │     ENTORNO DE PRODUCCIÓN      │
      │   Proyectos Firebase de Dev    │                │   Proyectos Firebase de Prod   │
      │ (Kiosko Comercial Enterprise)  │                │       (Kiosko Comercial)       │
      │   - Nuevos Módulos ERP         │                │   - Funcionalidades Estables   │
      │   - Esquemas de prueba DB      │                │   - Sin interrupción           │
      │   - Transacciones simuladas    │                │   - Clientes activos operando  │
      └────────────────────────────────┘                └────────────────────────────────┘
```

#### Reglas de Operación Segura para tu Equipo:
1.  **Doble Configuración de Clientes:**
    *   Utilizar un archivo de variables de entorno `.env` en cada build que decida cuál variable `FIREBASE_CONFIG` debe inyectar Vite.
    *   **Desarrollo:** Conecta a `gen-lang-client-dev-xxxx` (con su correspondiente base de datos).
    *   **Producción:** Conecta al ID `gen-lang-client-0213647704` que tiene asignado tu proyecto actual.
2.  **No Modificar "firestore.rules" en Vivo:**
    *   Las reglas de seguridad se despliegan únicamente mediante el script `deploy.sh` o el terminal de Firebase CLI, minimizando los errores por cambio manual directo desde la consola.
3.  **Proceso de GO-LIVE por Versiones:**
    *   Cada cliente de Kiosko Comercial descarga la última compilación de la SPA. Si deseas que los usuarios estables no se vean afectados por los módulos Enterprise pioneros, se puede implementar un **Feature Toggle (Bandera de Característica)** en la base de datos Firestore de cada usuario:
        ```json
        {
          "userId": "VCrXyLdMcclwrNmcDWUli5t...",
          "enterpriseModeActive": false, // Oculta o muestra el menú de módulos avanzados
          "plan": "Standard"
        }
        ```
    *   Esto permite empaquetar una sola SPA y liberar los módulos gigantes del ERP de forma selectiva para cada cliente desde tu administrador.

---

## 📈 Sección 4: Plan de Trabajo y Evolución a "Enterprise"

El paso de facturador de bajo costo a un ERP completo requiere la expansión estructurada de los esquemas de datos definidos en `firebase-blueprint.json` sin romper la compatibilidad retrospectiva.

### 4.1 Hoja de Ruta de Módulos Críticos
1.  **Módulo Multibodega (Advanced Inventory):**
    *   Actualmente el inventario asume un solo stock general.
    *   *Siguiente Paso:* Evolucionar la colección `products` para contener sub-registros de existencias por ubicación o sucursal (`branches/{branchId}/stock`).
2.  **Módulo Contable Completo (Libro Mayor y Cuentas por Cobrar/Pagar):**
    *   Integrar los datos de egresos de `expenses` y cuentas por cobrar de `creditAccounts` en asientos contables automáticos según normas NIIF (IFRS).
3.  **Control Multiusuario con Roles Dinámicos:**
    *   Implementar una subcolección `/users/{uid}/employees/` que admita accesos restringidos (ej: un cajero no puede modificar la resolución de consecutivos ni exportar márgenes de utilidad).

---

## 🔒 Sección 5: Conclusión y Firma de Estado

Kiosko Comercial queda registrado en este punto en su **V3.0** como el mejor sistema de facturación minorista de la región, blindado, estable y listo para recibir clientes con absoluta tranquilidad operativa. La base técnica es altamente modular y robusta para empezar a construir los peldaños que lo llevarán a ser la plataforma ERP más influyente de Latinoamérica.
