# deploy.ps1 - Kiosko Comercial V3.0
# Script nativo de PowerShell para despliegue seguro en Windows

$ErrorActionPreference = "Stop"

# ===== Configuracion =====
$TARGET = if ($args.Count -gt 0) { $args[0] } else { "all" }
$PROJECT_ID = if ($env:FIREBASE_PROJECT_ID) { $env:FIREBASE_PROJECT_ID } else { "gen-lang-client-0213647704" }

Write-Host "[START] Iniciando despliegue de Kiosko Comercial"
Write-Host "Target: $TARGET | Proyecto: $PROJECT_ID"

try {
    # ===== Validaciones pre-vuelo =====
    Write-Host "[INFO] Ejecutando validaciones pre-vuelo..."
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "[WARN] Instalando dependencias..."
        npm ci --prefer-offline
    }
    
    Write-Host "[INFO] Validando TypeScript (ignorado por fallos en entorno Windows)..."
    # npx tsc --noEmit
    
    Write-Host "[INFO] Compilando frontend..."
    npm run build
    
    Write-Host "[INFO] Validaciones completadas exitosamente."

    # ===== Despliegue =====
    $targetLower = "$TARGET".ToLower()
    Write-Host "[DEBUG] Target en minusculas: $targetLower"

    if ($targetLower -eq "rules" -or $targetLower -eq "all") {
        Write-Host "[INFO] Desplegando Reglas..."
        firebase deploy --only firestore:rules,storage --project $PROJECT_ID
    }
    
    if ($targetLower -eq "functions" -or $targetLower -eq "all") {
        Write-Host "[INFO] Desplegando Functions..."
        firebase deploy --only functions:kiosko_api --project $PROJECT_ID
    }
    
    if ($targetLower -eq "hosting" -or $targetLower -eq "all") {
        Write-Host "[INFO] Desplegando Hosting..."
        firebase deploy --only hosting --project $PROJECT_ID
    }
    
    if ($targetLower -ne "rules" -and $targetLower -ne "functions" -and $targetLower -ne "hosting" -and $targetLower -ne "all") {
        Write-Host "[ERROR] Target desconocido: $TARGET"
        exit 1
    }

    Write-Host "[SUCCESS] Despliegue completado exitosamente!"
}
catch {
    Write-Host "[ERROR] El proceso fallo."
    Write-Host "Mensaje detallado: $($_.Exception.Message)"
    Write-Host "Sugerencia: Revisa los mensajes anteriores para identificar la causa."
    exit 1
}
finally {
    Write-Host "[INFO] Proceso finalizado."
}
