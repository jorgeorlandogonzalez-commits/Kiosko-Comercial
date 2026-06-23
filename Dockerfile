# ============================================================================
# Kiosko Comercial V3.0 - Dockerfile para Cloud Run
# Usa server.cloudrun.ts (servidor minimalista SIN Vite)
# ============================================================================

# Etapa 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo dev)
RUN npm ci

# Copiar código fuente completo
COPY . .

# Compilar frontend (necesario para que el build no falle)
RUN npm run build

# ============================================================================
# Etapa 2: Producción
# ============================================================================
FROM node:22-alpine AS production

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar build generado
COPY --from=builder /app/dist ./dist

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Exponer puerto
EXPOSE 8080

# Health check con tiempo generoso de inicio
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Comando de inicio - USAR node dist/server.cjs
CMD ["node", "dist/server.cjs"]