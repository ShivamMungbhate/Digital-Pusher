FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY services/ai-mock/package*.json ./services/ai-mock/

RUN npm install

COPY apps/web ./apps/web

WORKDIR /app/apps/web
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 3000
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
