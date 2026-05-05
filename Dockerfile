# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
# better-sqlite3 is a native addon requiring compilation; install build tools.
# The compiled musl binary stays in node_modules and is copied to the
# production stage (same musl libc), so no build tools needed there.
FROM node:22-alpine AS backend-build
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# Stage 3: Production image (no build tools needed — binary already compiled)
FROM node:22-alpine
WORKDIR /app

COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY backend/migrations ./backend/migrations
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 4000

CMD ["node", "backend/dist/index.js"]
