# Arquitectura - Kiosko Comercial V3.0 (SaaS)

Este documento describe la arquitectura y los módulos principales de la plataforma Kiosko Comercial V3.0, un sistema de Punto de Venta (POS) y facturación electrónica diseñado para tenderos y comerciantes, bajo un modelo de Software as a Service (SaaS).

## 1. Stack Tecnológico

*   **Frontend:** React 18, TypeScript, Vite.
*   **Estilos:** Tailwind CSS (diseño enfocado en alta legibilidad, modo oscuro por defecto y UX para usuarios mayores de 50 años).
*   **Backend:** Node.js, Express (servido a través de Cloud Run / Google Cloud).
*   **Base de Datos / Backend-as-a-Service:** Firebase Firestore (Almacenamiento persistente en la nube) y Firebase Authentication.
*   **Sincronización Local:** Estado local manejado para funcionamiento ultra rápido, sincronizado en tiempo real con Firestore a través del servicio local de almacenamiento (`storageService.ts` / `firebaseSyncService.ts`).

## 2. Topología de la Arquitectura

La aplicación está diseñada con una arquitectura Full-Stack utilizando Express y Vite bajo el mismo entorno para facilitar el despliegue en contenedores (Cloud Run).

*   **Aplicación Cliente (React):** Interfaz SPA (Single Page Application) que gestiona el inventario, ventas, cuentas por cobrar y el asistente virtual.
*   **Servidor Backend (Express - `server.ts`):** 
    *   Provee middleware estático y de Vite para el frontend.
    *   Expone la API REST segura (`/api/*`) protegiendo las llaves privadas y lógica sensible.
    *   Maneja eventos externos como Webhooks de pagos (Wompi).
    *   Gestiona la emisión de facturación electrónica hacia la DIAN.

## 3. Módulos Principales

### 3.1 Sincronización y Persistencia de Datos
*   **`services/storageService.ts` & `services/firebaseSyncService.ts`:**
    *   El sistema carga y guarda datos localmente (`localStorage` / variables de estado en memoria) para garantizar que el cajero en el POS no sufra de latencia ("zero-latency UI").
    *   Simultáneamente, sincroniza los cambios hacia y desde Firebase Firestore de manera reactiva (en tiempo real) asegurando que los datos persistan en la nube.
    *   Cada comercio tiene una partición aislada basada en su `userId` de Firebase Auth.

### 3.2 Integración DIAN (Facturación Electrónica)
*   **Backend Handler (`backend/dianBackendHandlers.ts`):**
    *   Controlador de Express `dianTransmitHandler` responsable de construir el XML/UBL y transmitir a la DIAN o Proveedor Tecnológico.
    *   Se encarga de la generación del código de seguridad (CUFE) mediante el algoritmo SHA-384 oficial.
    *   La comunicación con la DIAN es completamente de lado del servidor (backend) por motivos de seguridad y manejo del certificado digital.

### 3.3 Motor SaaS y Pasarela de Pagos (Wompi)
*   **Controladores Backend (`backend/paymentsHandler.ts`):**
    *   Procesa las subscripciones (`createSubscriptionHandler`).
    *   Gestión de estados del periodo de prueba ("Trial").
    *   **Webhook Wompi:** Expone el endpoint `/api/payments/webhook` que recibe la confirmación asíncrona de pagos de Wompi Bancolombia, valida la firma criptográfica de integridad y actualiza de manera segura el estado del usuario en Firestore a `ACTIVE`.
*   **Componentes Frontend:**
    *   **`SaaSCheckout.tsx`:** Modal modular y de alta legibilidad que integra el Widget de Wompi de manera dinámica y presenta los planes. Su responsabilidad es puramente visual y de invocación, delegando la actualización de estado al Webhook del backend.
    *   **`TrialBanner.tsx`:** Micro-componente (píldora) integrado en la barra de navegación que informa de manera no intrusiva al usuario los días restantes de su prueba gratuita y su estado actual de pago.

### 3.4 Asistente de Inteligencia Artificial (Don J)
*   Asistente conversacional basado en la API de Gemini (Google), que reside de manera segura en el backend (`server.ts`).
*   Funciones (Function Calling) habilitadas para emitir facturas y guiar al usuario mediante lenguaje natural empático, pensado en usuarios mayores.

## 4. Flujo de Pago y Seguridad

Para evitar vulnerabilidades de manipulación en el lado del cliente (Frontend), el flujo de pago funciona así:
1.  El usuario abre `SaaSCheckout.tsx` e invoca el widget de Wompi.
2.  Wompi procesa el pago y lanza un evento de éxito al frontend (para mostrar la alerta de "Pago Aprobado") y dispara una petición HTTP POST al Webhook en nuestro Backend (`/api/payments/webhook`).
3.  El Backend captura el Webhook, valida que el checksum de integridad corresponda a la llave secreta del servidor de Wompi.
4.  Si es válido, el Backend actualiza Firestore (ej. estado `ACTIVE`).
5.  El Frontend, al estar suscrito a Firestore, detecta automáticamente el nuevo estado de suscripción y oculta el banner de trial o activa funciones bloqueadas.

## 5. Decisiones de Diseño (UX / UI)
*   Uso de variables y nombres de funciones libres de tecnicismos donde el usuario final pueda verlos.
*   Diseño en modo oscuro (o de alto contraste constante) para prevenir fatiga visual de los operarios de los Kioskos, que suelen usarlos por más de 12 horas seguidas.
*   Botones con áreas táctiles generosas (Touch targets > 44px) ideales para pantallas táctiles (POS touch).
