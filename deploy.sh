#!/bin/bash
# ============================================================================
# Kiosko Comercial V3.5 - Script de Despliegue Multi-Target
# ============================================================================
# Uso: ./deploy.sh <target> <entorno>
# Ejemplos:
#   ./deploy.sh firebase dev        → Firebase development
#   ./deploy.sh firebase prod       → Firebase production
#   ./deploy.sh cloud-run dev       → Cloud Run development
#   ./deploy.sh cloud-run prod      → Cloud Run production
#   ./deploy.sh all prod            → Todo (Firebase + Cloud Run) production
# ============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_ID="gen-lang-client-0213647704"
CLOUD_RUN_SERVICE="kiosko-backend"
CLOUD_RUN_REGION="us-central1"

# Funciones de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validar argumentos
if [ "$#" -lt 2 ]; then
    log_error "Uso: ./deploy.sh <target> <entorno>"
    echo ""
    echo "Targets disponibles:"
    echo "  firebase    - Despliega solo a Firebase (Hosting + Functions)"
    echo "  cloud-run   - Despliega solo a Cloud Run (Backend)"
    echo "  all         - Despliega a ambos (Firebase + Cloud Run)"
    echo ""
    echo "Entornos disponibles:"
    echo "  dev         - Desarrollo"
    echo "  prod        - Producción"
    echo ""
    echo "Ejemplos:"
    echo "  ./deploy.sh cloud-run prod"
    echo "  ./deploy.sh firebase dev"
    echo "  ./deploy.sh all prod"
    exit 1
fi

TARGET=$1
ENV=$2

# Validar target
if [[ "$TARGET" != "firebase" && "$TARGET" != "cloud-run" && "$TARGET" != "all" ]]; then
    log_error "Target inválido: $TARGET"
    echo "Targets válidos: firebase, cloud-run, all"
    exit 1
fi

# Validar entorno
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    log_error "Entorno inválido: $ENV"
    echo "Entornos válidos: dev, prod"
    exit 1
fi

log_info "🚀 Iniciando despliegue de Kiosko Comercial V3.5"
log_info "📦 Target: $TARGET | Entorno: $ENV | Proyecto: $PROJECT_ID"

# ============================================================================
# VALIDACIONES PRE-VUELO
# ============================================================================
log_info "🔍 Ejecutando validaciones pre-vuelo..."

# Verificar que estamos en la raíz del proyecto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. Asegúrate de estar en la raíz del proyecto."
    log_error "Directorio actual: $(pwd)"
    exit 1
fi

# Verificar TypeScript
log_info "🧹 Ejecutando TypeScript check..."
npm run lint
if [ $? -ne 0 ]; then
    log_error "TypeScript check falló. Corrige los errores antes de desplegar."
    exit 1
fi

# Compilar frontend
log_info "🔨 Compilando frontend con Vite..."
npm run build
if [ $? -ne 0 ]; then
    log_error "Build falló. Corrige los errores antes de desplegar."
    exit 1
fi

# Validar variables de entorno para producción
if [ "$ENV" == "prod" ]; then
    log_info "🔐 Validando variables de entorno para producción..."
    
    # Verificar que CERTIFICATE_PIN esté en Secret Manager
    if ! gcloud secrets describe certificate-pin --project=$PROJECT_ID &> /dev/null; then
        log_warn "⚠️  CERTIFICATE_PIN debe estar configurado en Google Secret Manager"
    fi
fi

log_success "✅ Validaciones pre-vuelo completadas."

# ============================================================================
# DESPLIEGUE A CLOUD RUN
# ============================================================================
deploy_cloud_run() {
    log_info "🐳 Desplegando backend en Cloud Run..."
    
    # Verificar que gcloud está instalado
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI no está instalado. Instala Google Cloud SDK:"
        echo "  https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Verificar autenticación
    if ! gcloud auth print-access-token &> /dev/null; then
        log_error "No estás autenticado con gcloud. Ejecuta:"
        echo "  gcloud auth login"
        exit 1
    fi
    
    # Configurar proyecto
    gcloud config set project $PROJECT_ID
    
    # Verificar que Dockerfile existe (búsqueda mejorada)
    DOCKERFILE_PATH=""
    if [ -f "./Dockerfile" ]; then
        DOCKERFILE_PATH="./Dockerfile"
    elif [ -f "Dockerfile" ]; then
        DOCKERFILE_PATH="Dockerfile"
    else
        log_error "No se encontró Dockerfile en el directorio actual"
        log_error "Directorio actual: $(pwd)"
        log_error "Archivos en el directorio:"
        ls -la | grep -i docker || echo "  (No hay archivos con 'docker' en el nombre)"
        log_info ""
        log_info "💡 Soluciones:"
        log_info "  1. Crea un archivo Dockerfile en la raíz del proyecto"
        log_info "  2. Verifica que el archivo se llame exactamente 'Dockerfile' (con D mayúscula)"
        exit 1
    fi
    
    log_success "✅ Dockerfile encontrado en: $DOCKERFILE_PATH"
    
    # Build y push a Artifact Registry
    log_info "🔨 Construyendo imagen Docker..."
    
    IMAGE_TAG="gcr.io/$PROJECT_ID/$CLOUD_RUN_SERVICE:$(date +%Y%m%d-%H%M%S)"
    
    docker build -t $IMAGE_TAG -f $DOCKERFILE_PATH .
    if [ $? -ne 0 ]; then
        log_error "Docker build falló."
        exit 1
    fi
    
    log_info "📤 Subiendo imagen a Artifact Registry..."
    docker push $IMAGE_TAG
    if [ $? -ne 0 ]; then
        log_error "Docker push falló. Verifica que Artifact Registry esté habilitado."
        exit 1
    fi
    
    # Desplegar a Cloud Run
    log_info "🚀 Desplegando en Cloud Run..."
    
    gcloud run deploy $CLOUD_RUN_SERVICE \
        --image $IMAGE_TAG \
        --platform managed \
        --region $CLOUD_RUN_REGION \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --set-env-vars "NODE_ENV=$ENV,GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
        --port 8080 \
        --timeout 300
    
    if [ $? -ne 0 ]; then
        log_error "Despliegue a Cloud Run falló."
        exit 1
    fi
    
    log_success "✅ Cloud Run desplegado exitosamente"
    
    # Mostrar URL del servicio
    SERVICE_URL=$(gcloud run services describe $CLOUD_RUN_SERVICE \
        --region $CLOUD_RUN_REGION \
        --format 'value(status.url)')
    
    log_info "🔗 URL del servicio: $SERVICE_URL"
}

# ============================================================================
# DESPLIEGUE A FIREBASE
# ============================================================================
deploy_firebase() {
    log_info "🔥 Desplegando en Firebase..."
    
    # Verificar que firebase-tools está instalado
    if ! command -v firebase &> /dev/null; then
        log_error "firebase-tools no está instalado. Ejecuta:"
        echo "  npm install -g firebase-tools"
        exit 1
    fi
    
    # Seleccionar proyecto
    if [ "$ENV" == "prod" ]; then
        FIREBASE_PROJECT="gen-lang-client-0213647704"
    else
        FIREBASE_PROJECT="gen-lang-client-0213647704-dev"
    fi
    
    log_info "📦 Proyecto Firebase: $FIREBASE_PROJECT"
    
    # Desplegar Firestore rules
    log_info "📜 Desplegando reglas de Firestore..."
    firebase deploy --only firestore:rules --project $FIREBASE_PROJECT
    
    # Desplegar Storage rules
    log_info "📦 Desplegando reglas de Storage..."
    firebase deploy --only storage:rules --project $FIREBASE_PROJECT
    
    # Desplegar Hosting
    log_info "🌐 Desplegando Hosting..."
    firebase deploy --only hosting --project $FIREBASE_PROJECT
    
    log_success "✅ Firebase desplegado exitosamente"
}

# ============================================================================
# EJECUCIÓN PRINCIPAL
# ============================================================================
case $TARGET in
    "cloud-run")
        deploy_cloud_run
        ;;
    "firebase")
        deploy_firebase
        ;;
    "all")
        deploy_cloud_run
        deploy_firebase
        ;;
esac

log_success "🎉 ¡Despliegue completado exitosamente!"
log_info ""
log_info "📊 Resumen:"
log_info "  Target: $TARGET"
log_info "  Entorno: $ENV"
log_info "  Proyecto: $PROJECT_ID"
log_info ""

if [ "$TARGET" == "cloud-run" ] || [ "$TARGET" == "all" ]; then
    log_info "🔗 Backend URL: https://$CLOUD_RUN_SERVICE-$(echo $PROJECT_ID | tr '_' '-').a.run.app"
fi

if [ "$TARGET" == "firebase" ] || [ "$TARGET" == "all" ]; then
    log_info "🔗 Frontend URL: https://$PROJECT_ID.web.app"
fi

log_info ""
log_info "✅ ¡Kiosko Comercial V3.5 está live en producción!"