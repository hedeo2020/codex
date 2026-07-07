FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm prisma generate && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
RUN corepack enable
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=app:app /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["sh","-c","pnpm prisma db push && pnpm start --hostname 0.0.0.0 --port ${PORT:-3000}"]
