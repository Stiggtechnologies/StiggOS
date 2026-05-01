# Multi-stage build for the staff console.
# Final image is nginx:alpine serving the static dist/, with a single-page-app
# fallback so client-side routes resolve correctly.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/console/package.json apps/console/
COPY packages ./packages
RUN npm ci --omit=dev=false

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN npm run build -w @stigg/console

FROM nginx:alpine
COPY infra/docker/console-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/console/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1
