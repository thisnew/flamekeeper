# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source
COPY . .

# NEXT_PUBLIC_APP_URL is INLINED AT BUILD TIME (Next.js replaces
# `process.env.NEXT_PUBLIC_*` with a literal, in server chunks too -- verified
# by grepping the built output). It feeds metadataBase and OpenGraph absolute
# URLs. Changing it at deploy time has NO effect; rebuild instead.
#
# Runtime origin (NextAuth redirects, email links, calendar feed) comes from
# AUTH_URL, which IS read at runtime -- see docker-compose.yml.
#
# The port matters: this project is served at https://<domain>:22247
ARG NEXT_PUBLIC_APP_URL=https://www.h83c4578f.nyat.app:22247
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Generate Prisma client, emit the PostgreSQL DDL, then build
RUN npx prisma generate
RUN npx prisma migrate diff \
      --from-empty \
      --to-schema-datamodel prisma/schema.prisma \
      --script > prisma/init.sql \
    && test -s prisma/init.sql
RUN npm run build

# Stage 2: Production runtime
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# bcryptjs + nodemailer are required at runtime by the seeder / mailer
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/nodemailer ./node_modules/nodemailer

# Uploads directory for member attachments, plus PRIVATE storage for uploaded
# WTF configs. storage/ is deliberately NOT under public/ -- those files are
# only reachable through the authenticated download route.
RUN mkdir -p /app/public/uploads /app/storage && \
    chown -R nextjs:nodejs /app/public/uploads /app/storage

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Bootstrap schema (no Prisma CLI in this image), seed defaults, then start
CMD ["sh", "-c", "node prisma/init-db.mjs && node prisma/seed.mjs && node server.js"]