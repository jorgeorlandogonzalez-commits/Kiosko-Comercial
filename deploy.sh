#!/bin/bash

# ============================================================================
# Kiosko Comercial - Script de Despliegue Profesional v3.0
# Uso: ./deploy.sh [target] [environment]
# Targets: all, hosting, functions, rules, cloud-run
# Environments: prod, dev
# ============================================================================

set -e  # Detener ejecución en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_ID="gen-lang-client-0213647704"
SERVICE_NAME="kiosko-backend"
REGION="us-central1"

# Parsear argumentos
TARGET=${1:-all}
ENVIRONMENT=${2:-prod}

echo -e "${BLUE}[INFO] 🚀 Iniciando despliegue de Kiosko Comercial V3.0${NC}"
echo -e "${BLUE}[INFO] 📦 Target: $TARGET | Entorno: $ENVIRONMENT | Proyecto: $PROJECT_ID${NC}"

# ============================================================================
# VALIDACIONES PRE-VUELO
# ============================================================================
echo -e "${BLUE}[INFO] 🔍 Ejecutando validaciones pre-vuelo...${NC}"

# 1. TypeScript Check
echo -e "${BLUE}[INFO] 🧹 Ejecutando TypeScript check...${NC}"
npm run lint || {
  echo -e "${RED}[ERROR] ❌ TypeScript check falló. Corregir errores antes de desplegar.${NC}"
  exit 1
}

# 2. Build
echo -e "${BLUE}[INFO] 🔨 Compilando frontend con Vite...${NC}"
npm run build || {
  echo -e "${RED}[ERROR] ❌ Build falló. Corregir errores antes de desplegar.${NC}"
  exit 1
}

# 3. Validar variables de entorno para producción
if [ "$ENVIRONMENT" = "prod" ]; then
  echo -e "${BLUE}[INFO] 🔐 Validando variables de entorno para producción...${NC}"
  
  # Verificar si CERTIFICATE_PIN está configurado
  if [ -z "$CERTIFICATE_PIN" ]; then
    echo -e "${YELLOW}[WARN] ⚠️  CERTIFICATE_PIN debe estar configurado en Google Secret Manager${NC}"
  fi
fi

echo -e "${GREEN}[INFO] ✅ Validaciones pre-vuelo completadas.${NC}"

# ============================================================================
# FUNCIONES DE DESPLIEGUE
# ============================================================================

deploy_hosting() {
  echo -e "${BLUE}[INFO] 🌐 Desplegando Firebase Hosting...${NC}"
  firebase deploy --only hosting --project $PROJECT_ID || {
    echo -e "${RED}[ERROR] ❌ Falló el despliegue de Hosting${NC}"
    return 1
  }
  echo -e "${GREEN}[INFO] ✅ Hosting desplegado exitosamente${NC}"
}

deploy_functions() {
  echo -e "${BLUE}[INFO] ⚡ Desplegando Cloud Functions...${NC}"
  firebase deploy --only functions --project $PROJECT_ID || {
    echo -e "${RED}[ERROR] ❌ Falló el despliegue de Functions${NC}"
    return 1
  }
  echo -e "${GREEN}[INFO] ✅ Functions desplegadas exitosamente${NC}"
}

deploy_rules() {
  echo -e "${BLUE}[INFO] 🔒 Desplegando reglas de Firestore...${NC}"
  firebase deploy --only firestore:rules --project $PROJECT_ID || {
    echo -e "${YELLOW}[WARN] ⚠️  No se pudieron desplegar las reglas de Firestore${NC}"
  }
  
  echo -e "${BLUE}[INFO] 📦 Desplegando reglas de Storage...${NC}"
  firebase deploy --only storage --project $PROJECT_ID || {
    echo -e "${YELLOW}[WARN] ⚠️  No se pudieron desplegar las reglas de Storage. Esto ocurre si no has habilitado Firebase Storage en la consola web de tu proyecto ($PROJECT_ID). Puedes habilitarlo en https://console.firebase.google.com/ y reintentar. Continuando con el despliegue...${NC}"
  }
  
  echo -e "${GREEN}[INFO] ✅ Reglas desplegadas${NC}"
}

deploy_cloud_run() {
  echo -e "${BLUE}[INFO] 🐳 Desplegando backend en Cloud Run...${NC}"
  
  # Verificar si Dockerfile existe
  if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}[ERROR] ❌ No se encontró el archivo Dockerfile. Crear Dockerfile antes de desplegar a Cloud Run.${NC}"
    exit 1
  fi
  
  gcloud run deploy $SERVICE_NAME \
    --source . \
    --project $PROJECT_ID \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --clear-base-image \
    --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=$PROJECT_ID" \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --min-instances=0 \
    --max-instances=10 || {
    echo -e "${RED}[ERROR] ❌ Falló el despliegue a Cloud Run${NC}"
    return 1
  }
  
  echo -e "${GREEN}[INFO] ✅ Cloud Run desplegado exitosamente${NC}"
}

# ============================================================================
# EJECUCIÓN PRINCIPAL
# ============================================================================

case $TARGET in
  all)
    deploy_rules
    deploy_functions
    deploy_hosting
    echo -e "${BLUE}[INFO] 💡 Para desplegar backend en Cloud Run, usa: ./deploy.sh cloud-run${NC}"
    ;;
  hosting)
    deploy_hosting
    ;;
  functions)
    deploy_functions
    ;;
  rules)
    deploy_rules
    ;;
  cloud-run)
    deploy_cloud_run
    ;;
  *)
    echo -e "${RED}[ERROR] ❌ Target no válido: $TARGET${NC}"
    echo -e "${YELLOW}[INFO] Targets disponibles: all, hosting, functions, rules, cloud-run${NC}"
    exit 1
    ;;
esac

# ============================================================================
# MENSAJE FINAL
# ============================================================================

echo -e "${GREEN}[INFO] 🎉 ¡Despliegue completado exitosamente!${NC}"
echo -e "${GREEN}[INFO] 🔗 Frontend: https://$PROJECT_ID.web.app${NC}"
echo -e "${GREEN}[INFO] 🔗 API: https://$REGION-$PROJECT_ID.cloudfunctions.net/kiosko_api${NC}"

if [ "$TARGET" = "cloud-run" ] || [ "$TARGET" = "all" ]; then
  echo -e "${GREEN}[INFO] 🔗 Cloud Run: https://$SERVICE_NAME-$(echo $PROJECT_ID | cut -c1-10).a.run.app${NC}"
fi