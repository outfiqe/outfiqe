FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.11 prune @outfiqe/api --docker

FROM base AS installer
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN pnpm --filter @outfiqe/api exec prisma generate

FROM installer AS deployer
RUN pnpm --filter=@outfiqe/api --prod --legacy deploy /app
RUN rm -rf /app/src/generated && cp -r /repo/apps/api/src/generated /app/src/generated

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deployer --chown=node:node /app ./
RUN mkdir -p /data/uploads /data/image-assets /data/image-temp && chown -R node:node /data
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["tini", "--"]
CMD ["node", "--import", "tsx", "--import", "./src/instrument.ts", "src/index.ts"]
