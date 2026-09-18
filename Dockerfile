FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat git ca-certificates openssh-client

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build time
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Supabase build-time variables dummy or provided
ARG NEXT_PUBLIC_SUPABASE_URL=https://cczeusftmsaykelqyfgu.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjemV1c2Z0bXNheWtlbHF5Zmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzU5OTYsImV4cCI6MjEwMjYxMTk5Nn0.1ky7ZfW3EqvbbRd3pKbRzMC_tyHDHzDiWyL9O29zUrA
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permission for prerender cache and sandbox workspace
RUN mkdir -p .next /app/.sandbox
RUN chown -R nextjs:nodejs .next /app/.sandbox

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Also copy source and node_modules for worker container execution
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
RUN git config --global --add safe.directory "*"

EXPOSE 3000

CMD ["node", "server.js"]
