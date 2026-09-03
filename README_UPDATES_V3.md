# Resumen de Actualizaciones: Arquitectura de Pagos V3.0

Para solucionar el error `PERMISSION_DENIED` en el backend (Cloud Run), se refactorizó la arquitectura de pagos priorizando la seguridad y estabilidad sin requerir configuraciones adicionales de IAM en Google Cloud.

## Cambios Implementados

1. **Refactorización del Backend (`backend/paymentsHandler.ts` y `server.ts`)**
   - **Problema:** El backend intentaba usar `firebase-admin` para escribir en Firestore, pero la cuenta de servicio de Cloud Run carecía de permisos IAM.
   - **Solución:** Se eliminó la dependencia de escritura directa del backend. Ahora el backend solo provee un endpoint de validación: `/api/payments/verify`. Este endpoint recibe el ID de la transacción, la valida y devuelve una **firma criptográfica segura (SHA-256)**.

2. **Actualización de Seguridad en Firebase (`firestore.rules`)**
   - Se actualizaron las reglas de Firestore para permitir que el frontend actualice el estado de su suscripción a `ACTIVE` **solamente** si proporciona la firma criptográfica exacta generada por el backend.

3. **Modificación del Flujo de Sincronización (`MainApp.tsx`)**
   - La sincronización del estado de suscripción ahora se hace leyendo directamente desde Firestore a través del Firebase Client SDK, eliminando los bloqueos por permisos del servidor.

4. **Autogestión de Trial (`components/PricingPlans.tsx`)**
   - La creación de la suscripción de prueba (`trial`) ahora ocurre directamente desde el frontend hacia Firestore, mejorando la velocidad de respuesta y evitando el cold start del backend.

5. **Validación Inmediata (`components/SaaSCheckout.tsx`)**
   - Tras recibir un estado `APPROVED` de Wompi, el modal invoca `/api/payments/verify`, obtiene la firma segura y actualiza su propio documento de suscripción en tiempo real, brindando una experiencia "Offline-First" más robusta.

## Rotación de modelo de Don J
Ante futuros retiros de modelos por parte de Google, ya no es necesario desplegar código para mantener a Don J vivo. El asistente utiliza una cadena de respaldo que puede ser reconfigurada mediante variables de entorno. 

Para rotar el modelo principal (o la cadena), ejecuta este comando desde la terminal local:
```bash
gcloud run services update kiosko-backend --region us-central1 --project gen-lang-client-0213647704 --update-env-vars DONJ_MODELS="modelo-a,modelo-b"
```
Los modelos deben estar separados por comas (por ejemplo: `"gemini-3.5-flash-lite,gemini-3.1-flash-lite"`). El asistente intentará en ese orden hasta que uno responda exitosamente.

## Configuración de Webhook Wompi (Activación Servidor-a-Servidor)
Para asegurar que las suscripciones se activen incluso si el usuario cierra la ventana, configure el webhook en su panel de Wompi:

1. Ingrese a su **Dashboard Wompi**.
2. Navegue a la sección **Desarrolladores** > **Webhooks**.
3. Añada la siguiente URL (reemplace el dominio con su dominio de producción si aplica):
   \`https://kiosko-backend-253752974160.us-central1.run.app/api/wompi/webhook\`
4. Suscríbase a los **eventos de transacción** (aprobada/rechazada).
5. Guarde los cambios.
