FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Descarga fuentes durante la construcción, nunca durante el arranque.
RUN node docker/universidad/prepare-build.mjs
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build pnpm build

FROM build AS production-deps
RUN pnpm prune --prod

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && mkdir -p /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main' > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && mkdir -p /etc/postgresql-common \
    && echo 'create_main_cluster = false' > /etc/postgresql-common/createcluster.conf \
    && apt-get install -y --no-install-recommends postgresql-16 python3 tini \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 BODY_SIZE_LIMIT=12M WORKFLOW_LOCAL_HTTP=true SHUTDOWN_TIMEOUT=5
COPY --from=build /app/build ./build
COPY --from=production-deps /app/node_modules ./node_modules
COPY package.json ./
COPY drizzle ./drizzle
COPY docker/universidad /app/docker/universidad
RUN mkdir -p /var/lib/workflow /run/postgresql \
    && ln -s /var/lib/workflow/uploads /app/uploads \
    && chown postgres:postgres /run/postgresql
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 CMD ["node", "/app/docker/universidad/healthcheck.mjs"]
ENTRYPOINT ["/usr/bin/tini", "--", "python3", "/app/docker/universidad/supervisor.py"]
