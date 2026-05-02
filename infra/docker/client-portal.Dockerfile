FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/client-portal/package.json apps/client-portal/
COPY packages ./packages
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN npm run build -w @stigg/client-portal

FROM nginx:alpine
COPY infra/docker/console-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/client-portal/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1
