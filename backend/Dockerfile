# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Copy prisma schema (needed by postinstall's "prisma generate")
COPY src/prisma ./src/prisma

# Install ALL dependencies (including devDependencies for tsc, tsc-alias)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Compile TypeScript to dist/
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy prisma schema (needed by postinstall's "prisma generate" and runtime migrations)
COPY src/prisma ./src/prisma

# Install production dependencies only (+ postinstall runs prisma generate)
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy prisma migrations (needed by "prisma migrate deploy" at startup)
COPY --from=builder /app/src/prisma/migrations ./src/prisma/migrations


# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
