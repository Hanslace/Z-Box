# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy only what we need to run
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# If you have a next.config.* file:
COPY --from=builder /app/next.config.* ./

EXPOSE 4000

# npm start should run "next start"
CMD ["npm", "start"]
