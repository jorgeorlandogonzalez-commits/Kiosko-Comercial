# Arquitectura - Kiosko Comercial V3.0 (SaaS)

Este documento describe la arquitectura y los módulos principales de la plataforma Kiosko Comercial V3.0, un sistema de Punto de Venta (POS) y facturación electrónica diseñado para tenderos y comerciantes, bajo un modelo de Software as a Service (SaaS). Ha alcanzado su **Gran Lanzamiento (Go-Live)** y opera bajo una arquitectura **Full-Stack SPA (Single Page Application)** robusta, con un enfoque **Offline-First**.

## 1. Stack Tecnológico e Infraestructura Productiva

*   **Dominios y Redirección:** `kioskocomercial.com` y `www.kioskocomercial.com` (conectados vía Cloud Run).
*   **Frontend Distribuido:** React 18, TypeScript, Vite, Tailwind CSS (diseño enfocado en alta legibilidad, modo oscuro por defecto y UX para usuarios mayores de 50 años).
*   **Servidor Backend Global (Cloud Run):** Desplegado en us-east1 o us-central1, usando Node.js y Express 5 nativo. Provee middleware estático y de Vite para el frontend, expone la API REST segura (`/api/*`) y maneja eventos externos (Webhooks Wompi, Emisión DIAN).
*   **Base de Datos / Persistencia:** Firebase Firestore (Almacenamiento persistente en la nube) y Firebase Authentication.
*   **Sincronización Local (Offline-First):** Estado local manejado para funcionamiento ultra rápido, sincronizado en tiempo real con Firestore a través del servicio local de almacenamiento (`storageService.ts` / `firebaseSyncService.ts`).
*   **Seguridad Estricta:** Reglas IAM de Firebase/Storage, y protección de secretos transaccionales (`CERTIFICATE_PIN`, Claves de Wompi) delegadas a variables de entorno en Google Cloud Run.

## 2. Decisiones Clave de Diseño y Módulos Principales

### 2.1 Aislamiento de Cargas (Micro-Monolito en Cloud Run)
*   **Decisión:** El frontend hiper-optimizado es servido junto con el backend por Node.js/Express, mientras que todas las llamadas asíncronas de I/O pesado (Validación DIAN, Firmas criptográficas, webhooks de Wompi, y proxy al Asistente Don J de Gemini) recaen en el contenedor asíncrono y autoescalable de Cloud Run.
*   **Contenedorización:** Etapa de construcción con `npm ci` y `npm run build`, seguida de una etapa de producción basada en `node:22-alpine` limpia, corriendo `dist/server.cjs` compilado por esbuild. Esto asegura "Cold Starts" mínimos para Express.

### 2.2 Sincronización y Persistencia de Datos
*   El sistema carga y guarda datos localmente (`localStorage` / variables de estado en memoria) para garantizar que el cajero en el POS no sufra de latencia ("zero-latency UI").
*   Simultáneamente, sincroniza los cambios hacia y desde Firebase Firestore de manera reactiva (en tiempo real) asegurando que los datos persistan en la nube. Cada comercio tiene una partición aislada basada en su `userId` de Firebase Auth.

### 2.3 Integración DIAN (Facturación Electrónica)
*   **Backend Handler (`backend/dianBackendHandlers.ts`):** Controlador de Express responsable de construir el XML/UBL y transmitir a la DIAN o Proveedor Tecnológico.
*   Se encarga de la generación del código de seguridad (CUFE) mediante algoritmos oficiales.
*   El manejo del certificado digital (P12) y su contraseña (`CERTIFICATE_PIN`) ocurre estrictamente del lado del servidor.

### 2.4 Motor SaaS y Pasarela de Pagos (Wompi Bancolombia)
*   **Event-Driven:** Integración completa de Wompi para gestión de suscripciones. Las transacciones inician en el Frontend con el Widget de Wompi (que redirecciona al concluir) y se verifican criptográficamente en el Backend.
*   **Validación de Integridad:** El backend utiliza la llave de eventos / `WOMPI_INTEGRITY_SECRET` configurado en Cloud Run para validar las firmas criptográficas de las transacciones (e.g. en el Webhook y en el flujo de verificación de redirección `verifyPaymentHandler`), asegurando que solo pagos aprobados cambien el estado del usuario a `ACTIVE` de forma automática.
*   **Onboarding:** Periodo de prueba gratuito (Trial) automatizado al registro. Los superusuarios tienen bypass automático para propósitos de soporte.

### 2.5 Asistente de Inteligencia Artificial (Don J - sumercé)
*   Asistente conversacional basado en la API de Gemini (Google), que reside de manera segura en el backend (`server.ts`).
*   Funciones (Function Calling) habilitadas para emitir facturas y guiar al usuario mediante lenguaje natural empático, pensado en usuarios mayores.
*   **Seguridad:** Todo el flujo y el uso de `GEMINI_API_KEY` ocurre únicamente mediante variables de ambiente en Cloud Run.

## 3. Decisiones de Diseño (UX / UI)
*   Uso de variables y nombres de funciones libres de tecnicismos donde el usuario final pueda verlos.
*   Diseño enfocado para prevenir fatiga visual de los operarios de los Kioskos, que suelen usarlos por más de 12 horas seguidas.
*   Botones con áreas táctiles generosas (Touch targets > 44px) ideales para pantallas táctiles (POS touch).

## 4. Pipeline de Despliegue CI/CD
El pipeline de Cloud Build se activa mediante triggers desde GitHub, realizando:
1. Clonado del repositorio.
2. Compilación (Build) Docker con imagen ligera `node:22-alpine` multi-stage.
3. Push al Artifact Registry en GCP.
4. Despliegue automático (Deploy) a Cloud Run, mapeando el tráfico al nuevo contenedor y exponiéndolo bajo el dominio configurado.
