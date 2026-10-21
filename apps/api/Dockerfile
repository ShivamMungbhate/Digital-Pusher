FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY services/ai-mock/package*.json ./services/ai-mock/

RUN npm install

COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install --omit=dev --workspace=apps/api

COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 4000

CMD ["node", "dist/server.js"]
