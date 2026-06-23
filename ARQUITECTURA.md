# 🏗️ Documento de Arquitectura: Kiosko Comercial V3.0 (Go-Live Edition)

## 1. Visión General de la Arquitectura

La aplicación ha alcanzado su **Gran Lanzamiento (Go-Live)** y opera bajo una arquitectura **Full-Stack SPA (Single Page Application)** robusta, con un enfoque **Offline-First**. Respaldada por servicios serverless de alto rendimiento en Google Cloud Platform, asegura concurrencia y tolerancia a fallos.

**Infraestructura Productiva y Stack Tecnológico:**
*   **Dominios y Redirección:** `kioskocomercial.com` y `www.kioskocomercial.com` (conectados vía Firebase Hosting global CDN).
*   **Frontend Distribuido:** React 19 + TypeScript + Vite, sirviendo PWA/SPA desde CDN global.
*   **Servidor Backend Global (Cloud Run):** Desplegado en `kiosko-backend` (us-central1), usando Node.js 22+ y Express 5 nativo.
*   **Base de Datos / Persistencia:** Firebase Firestore (Cloud) + Caché Local Híbrida.
*   **Pasarela de Pagos (SaaS):** Webhooks de Wompi Bancolombia configurados y listos mediante variables de entorno seguras en Cloud Run.
*   **Seguridad Estricta:** Reglas IAM de Firebase/Storage, y protección de secretos transaccionales (`CERTIFICATE_PIN`, Claves de Wompi) y firmas de XML DIAN delegadas a **Google Secret Manager**.

---

## 2. Decisiones Clave de Diseño y Autoridad (Go-Live)

1.  **Aislamiento de Cargas (Micro-Monolito en Cloud Run):**
    *   *Decisión:* El frontend hiper-optimizado es servido desde Firebase Hosting CDN, mientras que todas las llamadas asíncronas de I/O pesado (Validación DIAN, Firmas criptográficas node-forge, webhooks de Wompi, y proxy al Asistente Don J de Gemini) recaen en el contenedor de Google Cloud Run asíncrono y autoescalable.
    *   *Desempeño:* Se reemplazó el middleware Vite de desarrollo por uso completo estático/Node en el pipeline, asegurando tiempos de arranque "Cold Start" milisegundos para Express.

2.  **Seguridad y Disponibilidad del Asistente IA (Don J - sumercé):**
    *   *Decisión:* Todo el flujo de IAM (Gemini API Key) existe únicamente en variables de ambiente inyectadas por Cloud Run.
    *   *Protección y Carga:* Limitación a 30 consultas/minuto por contenedor para prevenir desuso de cuotas abusivo.

3.  **Manejo Híbrido Criptográfico P12 (Para DIAN):**
    *   *Seguridad Transaccional:* Implementación avanzada que almacena referencias seguras al certificado P12, recuperando su hash pin de autenticación desde el Secret Manager del proyecto originador (`gen-lang-client-0213647704`). Así, los administradores de DevOps no tocan las llaves maestras de representación legal de los comerciantes de la red SaaS.

---

## 3. Modelo SaaS y Gestión de Suscripciones (Activo)

### A. Ciclo de Vida del Onboarding
*   **Prueba Gratuita:** Al registrarse, el UUID generará estado `TRIAL` para probar funcionalidad local offline e inteligencia artificial.
*   **Escalabilidad Administrativa:** `jorge.orlando.gonzalez@gmail.com` goza de `TRIAL` perpetuo incrustado por reglas organizacionales.

### B. Módulo de Recaudo Automático Wompi (Bancolombia)
*   **Implementado:** Pasarela configurada en `/api/payments/webhook`.
*   **Event-Driven:** Las integraciones validan HMAC y firmas `WOMPI_EVENT_SECRET_PROD`, inyectando pagos asincrónicamente al Store Manager de Firestore y levantando banderas `ACTIVE` en usuarios de forma auto-guiada. En caso de no existir llaves, se deniega acceso ("Webhooks rejected in production").

---

## 4. Estructura de Despliegue CI/CD y Contenedorización

### A. Estrategia de Contenedorización (Dockerfile)
Contenedorización en 2 Etapas aislando paquetes vulnerables:
1.  **Etapa de Construcción:** Instala dependencias con `npm ci` y ejecuta builds gemelos de Vite (Assets minimificados + chunks lazy-load) y TypeScript para backend (Vía API).
2.  **Etapa Runner de Producción:** Usa imagen base `node:22-alpine` limpia y lanza Node crudo para levantar Express 5.
*Resultado:* Cero dependencias colaterales enviadas a Cloud Run.

### B. Pipeline de Operación (`deploy.sh`)
El engranaje del CI/CD cuenta un pipeline explícito y resiliente programado en Bash Scripting multiplataforma:
1. `npm run lint` detiene el paso a Cloud si halla errores.
2. `firestore.rules` y `storage.rules` propagan seguridad pre-carga.
3. Se finaliza con el push push final al repositorio de repositorios Artifact Registry y balanceo automático en Cloud Run.

---

## 📋 Anexo A: Checklist de Lanzamiento Producción

- [x] Aplicación corriendo operativamente en `kioskocomercial.com` y `www.kioskocomercial.com`.
- [x] Contenedorización Multi-etapa implementada (`Dockerfile` ligero) en us-central1 (Cloud Run).
- [x] Compilador del servidor y frontend integrados sin fallos.
- [x] Webhooks transaccionales (Wompi) incorporados condicionales a variables IAM (`cloud-run`).
- [x] Reglas de base de datos de Firestore y Storage estrictas propagadas vía web (`storage.rules`).
- [x] Refactorización exitosa de dependencias inyectables (Gemini/Node-Forge/DIAN).

---

## 🗺️ Anexo B: Próximos Avances y Fase de Maduración Operativa

### Sprint Inmediato
- Traspaso a esquemas de producción plenos en Wompi (Verificación final API Keys Reales sobre Secrets en GCP).
- Pruebas A/B de conversiones desde CTA del Landing Page.

### Fase Documental como Plataforma Tecnológica
- Trámite final ante la DIAN con evidencias transaccionales demostrables en logs de Cloud Run.
- Homologación de Software según resolución DIAN (Emisión de los primeros 100 documentos en vivo).