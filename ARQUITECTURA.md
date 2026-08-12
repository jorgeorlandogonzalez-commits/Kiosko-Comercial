# Arquitectura - Kiosko Comercial V3.3 (SaaS)

Este documento describe la arquitectura y los módulos principales de la plataforma Kiosko Comercial V3.3, un sistema de Punto de Venta (POS) y facturación electrónica diseñado para tenderos y comerciantes, bajo un modelo de Software as a Service (SaaS). Ha alcanzado su **Gran Lanzamiento (Go-Live)** y opera bajo una arquitectura **Full-Stack SPA (Single Page Application)** robusta, con un enfoque **Offline-First**.

## 1. Stack Tecnológico e Infraestructura Productiva

* **Dominios y Redirección:** `kioskocomercial.com` y `www.kioskocomercial.com` (conectados vía Cloud Run).
* **Frontend Distribuido:** React 19, TypeScript, Vite, Tailwind CSS (diseño enfocado en alta legibilidad, modo oscuro por defecto y UX para usuarios mayores de 50 años).
* **Servidor Backend Global (Cloud Run):** Desplegado en us-central1, usando Node.js 22 y Express 5 nativo. Provee middleware estático para el frontend, expone la API REST segura (`/api/*`) y maneja eventos externos (Webhooks Wompi, Emisión DIAN, proxy del asistente Don J).
* **Base de Datos / Persistencia:** Firebase Firestore (Almacenamiento persistente en la nube) y Firebase Authentication.
* **Sincronización Local (Offline-First):** Estado local manejado para funcionamiento ultra rápido, sincronizado en tiempo real con Firestore a través del servicio local de almacenamiento (`storageService.ts` / `firebaseSyncService.ts`).
* **Seguridad Estricta:** Reglas IAM de Firebase/Storage, y protección de secretos transaccionales (`CERTIFICATE_PIN`, Claves de Wompi) delegadas a variables de entorno y Google Secret Manager en Cloud Run.

## 2. Decisiones Clave de Diseño y Módulos Principales

### 2.1 Aislamiento de Cargas (Micro-Monolito en Cloud Run)
* **Decisión:** El frontend hiper-optimizado es servido junto con el backend por Node.js/Express, mientras que todas las llamadas asíncronas de I/O pesado (Validación DIAN, Firmas criptográficas, webhooks de Wompi, y proxy al Asistente Don J de Gemini) recaen en el contenedor asíncrono y autoescalable de Cloud Run.
* **Contenedorización:** Etapa de construcción con `npm ci` y `npm run build`, seguida de una etapa de producción basada en `node:22-alpine` limpia, corriendo `dist/server.cjs` compilado por esbuild. Esto asegura "Cold Starts" mínimos para Express.

### 2.2 Sincronización y Persistencia de Datos
* El sistema carga y guarda datos localmente (`localStorage` / variables de estado en memoria) para garantizar que el cajero en el POS no sufra de latencia ("zero-latency UI").
* Simultáneamente, sincroniza los cambios hacia y desde Firebase Firestore de manera reactiva (en tiempo real) asegurando que los datos persistan en la nube. Cada comercio tiene una partición aislada basada en su `userId` de Firebase Auth.

### 2.3 Integración DIAN (Facturación Electrónica)
* **Backend Handler (`backend/dianBackendHandlers.ts`):** Controlador de Express responsable de construir el XML/UBL y transmitir a la DIAN o Proveedor Tecnológico.
* **Validación de Payload:** Se implementa validación estricta utilizando esquemas de `zod` (`dianPayloadSchema`) para asegurar la integridad de la estructura de la factura antes del procesamiento.
* Se encarga de la generación del código de seguridad (CUFE) mediante algoritmos oficiales.
* El manejo del certificado digital (P12) y su contraseña (`CERTIFICATE_PIN`) ocurre estrictamente del lado del servidor.

#### 2.3.1 Seguridad del Certificado Digital
- **Almacenamiento:** El archivo .p12 se almacena en Firebase Storage bajo el path `users/{uid}/certificates/` con reglas de seguridad estrictas que impiden lectura pública. El PIN se almacena en Google Secret Manager con rotación automática.
- **Custodia:** Kiosko Comercial actúa como **custodio técnico** del certificado bajo autorización explícita y revocable del usuario. El certificado NUNCA se expone al frontend ni se transmite fuera de la infraestructura de Google Cloud.
- **Firma:** La firma criptográfica del XML ocurre exclusivamente en el backend (Cloud Run) en memoria efímera, sin persistencia en disco.
- **Auditoría:** Cada uso del certificado se registra en logs estructurados (timestamp, userId, invoiceId) para trazabilidad legal.
- **Eliminación:** Cuando el usuario elimina su certificado desde Configuración, se ejecuta un purge inmediato tanto en Storage como en Secret Manager (no soft-delete).

#### 2.3.2 Pipeline de Reintentos DIAN (Anti-Pérdida)
- **Cola de Reintentos:** Las facturas que fallan en transmisión a DIAN (timeout, error 503, red caída) se encolan automáticamente en Firestore bajo la colección `users/{userId}/invoices_queue` con estado `PENDING_DIAN`.
- **Estrategia de Reintentos:** Backend job periódico (cada 5 minutos) procesa la cola con reintentos exponenciales (1min, 5min, 15min, 1h, 4h).
- **Idempotencia:** Cada reintento envía el mismo CUFE candidato para evitar duplicados ante la DIAN.
- **Dead Letter Queue:** Después de 5 intentos fallidos, la factura se marca como `FAILED` y se notifica al usuario vía email + WhatsApp.
- **Garantía:** At-least-once delivery. La factura se marca como `APPROVED` solo al recibir ACK explícito de la DIAN o del Proveedor Tecnológico.

### 2.4 Motor SaaS y Pasarela de Pagos (Wompi Bancolombia)
* **Event-Driven:** Integración completa de Wompi para gestión de suscripciones. Las transacciones inician en el Frontend con el Widget de Wompi (que redirecciona al concluir) y se verifican criptográficamente en el Backend.
* **Modelo de Negocio:** Periodo de prueba gratuito (15 días), seguido de suscripción mensual ($49.900 COP) o anual ($499.000 COP, equivalente a 2 meses gratis).
* **Validación de Integridad:** El backend utiliza la llave de eventos / `WOMPI_INTEGRITY_SECRET` configurado en Cloud Run para validar las firmas criptográficas de las transacciones, asegurando que solo pagos aprobados cambien el estado del usuario a `ACTIVE` de forma automática.
* **Estado:** Operando en producción con llaves reales de Wompi; los cobros reales están activos y verificados de extremo a extremo.
* **Onboarding:** Periodo de prueba gratuito (Trial) automatizado al registro. Los superusuarios tienen bypass automático para propósitos de soporte.

### 2.5 Asistente de Inteligencia Artificial (Don J - sumercé)
* Asistente conversacional basado en la API de Gemini (Google), que reside de manera segura en el backend (`server.ts`), con System Instruction V3.5 (Alma + Enterprise-Ready: personalidad original de Don J restaurada + discriminador pregunta/venta + régimen fiscal dinámico).
* **Inyección de Contexto, Roles y Features:** El backend inyecta activamente en la sesión de Don J el plan activo (`userPlan`), el rol del usuario (`userRole`, leído de Firestore y nunca del cliente), el catálogo de planes (`planCatalog`) y las banderas de características (`features.notasCredito`), garantizando que la IA module su tono, respete la confidencialidad por rol y solo ofrezca funcionalidades habilitadas para el plan del usuario.
* **Validación de Payload V3.2:** El endpoint `/api/dian/transmit` valida con `dianPayloadSchema` (Zod) los tipos de documento 91/92/93 y métodos de pago Contado/Crédito, con validaciones cruzadas (nota obligatoria para 92/93, fecha de vencimiento obligatoria para crédito) y guarda server-side que bloquea notas hasta habilitar su backend.
* **Don J V3.3 (Discriminador Pregunta/Venta):** La IA solo genera el JSON de factura cuando el usuario realiza una venta real (verbos: vender, facturar, cobrar, emitir factura, con productos y precios). Para preguntas conceptuales ("¿cuánto gané?", "¿qué es el IVA?") responde únicamente con texto explicativo, sin estructura JSON, evitando facturas vacías y alucinaciones.
* Funciones (Function Calling) habilitadas para emitir facturas y guiar al usuario mediante lenguaje natural empático, pensado para usuarios mayores.
* **Seguridad:** Todo el flujo y el uso de `GEMINI_API_KEY` ocurre únicamente mediante variables de ambiente en Cloud Run. El endpoint del asistente requiere token Firebase verificado (`verifyFirebaseToken`).

## 3. Decisiones de Diseño (UX / UI)
* Uso de variables y nombres de funciones libres de tecnicismos donde el usuario final pueda verlos.
* Diseño enfocado para prevenir fatiga visual de los operarios de los Kioskos, que suelen usarlos por más de 12 horas seguidas.
* Botones con áreas táctiles generosas (Touch targets > 44px) ideales para pantallas táctiles (POS touch).

## 4. Pipeline de Despliegue CI/CD
El pipeline de Cloud Build se activa mediante triggers desde GitHub, realizando:
1. Clonado del repositorio.
2. Compilación (Build) Docker con imagen ligera `node:22-alpine` multi-stage.
3. Push al Artifact Registry en GCP.
4. Despliegue automático (Deploy) a Cloud Run, mapeando el tráfico al nuevo contenedor y exponiéndolo bajo el dominio configurado.


## 📡 Anexo D: API Endpoints Documentados

### Endpoints de Facturación Electrónica
- `POST /api/dian/transmit` → Firma XML con certificado .p12 y transmite a DIAN/PT. Requiere Bearer token Firebase.
- `GET /api/dian/estado/:cufe` → Consulta estado de factura en DIAN por CUFE.

### Endpoints de Asistente IA
- `POST /api/gemini/assistant` → Proxy seguro a Gemini API con contexto inyectado (plan, rol, features). Requiere Bearer token Firebase.

### Endpoints de Pagos
- `POST /api/payments/webhook` → Recibe eventos asíncronos de Wompi Bancolombia, valida firma HMAC y actualiza estado de suscripción.
- `POST /api/payments/create-subscription` → Crea nueva suscripción y redirige a widget de Wompi.
- `GET /api/payments/status/:userId` → Consulta estado de suscripción activa.

### Endpoints de Sistema
- `GET /api/health` → Health check del contenedor (uptime, versión, modo).
