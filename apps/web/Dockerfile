FROM node:22-alpine

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web apps/web
COPY packages/schemas packages/schemas
COPY packages/solver packages/solver
COPY packages/scad-service packages/scad-service
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @educational-hardware-builder/web build:sandbox

EXPOSE 3000
CMD ["pnpm", "--filter", "@educational-hardware-builder/web", "start"]
