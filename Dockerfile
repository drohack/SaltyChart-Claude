# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:22-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine
WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy compiled backend
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY backend/migrations ./backend/migrations

# Copy built frontend into expected location
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 4000

CMD ["node", "backend/dist/index.js"]
