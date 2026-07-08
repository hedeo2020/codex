FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv python3-pip build-essential cmake libopenblas-dev liblapack-dev libjpeg-dev && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY python/requirements.txt ./python/requirements.txt
RUN pnpm install --frozen-lockfile
RUN pip install --no-cache-dir -r python/requirements.txt

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PATH="/opt/venv/bin:$PATH"
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /opt/venv /opt/venv
COPY . .
RUN corepack enable && pnpm prisma generate && pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PATH="/opt/venv/bin:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends python3 libopenblas0 liblapack3 libjpeg62-turbo && rm -rf /var/lib/apt/lists/*
RUN groupadd --system app && useradd --system --gid app --create-home --home-dir /home/app app
RUN corepack enable
COPY --from=deps /opt/venv /opt/venv
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
