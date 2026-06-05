# ---- Frontend Build Stage ----
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Backend Build Stage ----
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
COPY backend/src/prisma ./src/prisma
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine
WORKDIR /app

# Copy Backend package files
COPY backend/package.json backend/package-lock.json ./

# Copy prisma schema
COPY backend/src/prisma ./src/prisma

# Install production backend dependencies
RUN npm ci --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/src/prisma/migrations ./src/prisma/migrations

# Copy compiled frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
