FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
RUN npm install -g npm@11
WORKDIR /app
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
RUN npm ci
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN cd apps/api && npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Copier les deux node_modules : root (packages hoistés) + workspace api (packages non-hoistés)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main"]
