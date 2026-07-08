# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="/opt/venv/bin:$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-dev \
    python3-venv \
    python3-pip \
    build-essential \
    cmake \
    pkg-config \
    libopenblas-dev \
    liblapack-dev \
    libjpeg-dev \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
RUN python3 -m venv /opt/venv

FROM base AS python-deps
COPY python/requirements.txt ./python/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r python/requirements.txt

FROM base AS node-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS build
COPY --from=node-deps /app/node_modules ./node_modules
COPY --from=python-deps /opt/venv /opt/venv
COPY . .
RUN --mount=type=cache,target=/pnpm/store \
    pnpm prisma generate && pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PNPM_HOME=/pnpm
ENV PATH="/opt/venv/bin:$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    libopenblas0 \
    liblapack3 \
    libjpeg62-turbo \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN groupadd --system app && useradd --system --gid app --create-home --home-dir /home/app app
RUN corepack enable
COPY --from=python-deps /opt/venv /opt/venv
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/python ./python
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["sh","-c","pnpm prisma db push && pnpm db:seed && pnpm start --hostname 0.0.0.0 --port ${PORT:-3000}"]
