FROM node:20-alpine AS builder
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
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main"]
