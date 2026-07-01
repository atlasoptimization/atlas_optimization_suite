FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/deck-assets/package.json ./packages/deck-assets/package.json

RUN pnpm install --frozen-lockfile

COPY apps ./apps
COPY packages ./packages

ARG VITE_ATLAS_BACKEND_URL=http://localhost:8000
ENV VITE_ATLAS_BACKEND_URL=${VITE_ATLAS_BACKEND_URL}

RUN pnpm --filter @dsd/web build

FROM nginx:1.27-alpine

COPY deployments/local_docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
