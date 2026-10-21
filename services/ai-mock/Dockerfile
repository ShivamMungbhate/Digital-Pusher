FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY services/ai-mock/package*.json ./services/ai-mock/

RUN npm install

COPY services/ai-mock ./services/ai-mock

WORKDIR /app/services/ai-mock
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY services/ai-mock/package*.json ./services/ai-mock/
RUN npm install --omit=dev --workspace=services/ai-mock

COPY --from=builder /app/services/ai-mock/dist ./services/ai-mock/dist

WORKDIR /app/services/ai-mock
EXPOSE 5001

CMD ["node", "dist/server.js"]
