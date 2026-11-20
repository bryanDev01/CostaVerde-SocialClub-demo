# ============================================================================
# Backend demo — Club Social Costa Verde (Railway/Render usa este Dockerfile
# de la raíz porque el repo es un monorepo; solo se despliega el backend).
# ============================================================================
FROM node:24-alpine AS build
WORKDIR /app
COPY am-social-club-backend/package.json am-social-club-backend/package-lock.json ./
RUN npm ci
COPY am-social-club-backend/ ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY am-social-club-backend/package.json ./package.json
# Las migraciones se copian para poder ejecutar scripts/migrate.mjs desde el contenedor
COPY am-social-club-backend/scripts ./scripts
COPY am-social-club-backend/src/db/migrations ./src/db/migrations
EXPOSE 4000
CMD ["node", "dist/server.js"]
