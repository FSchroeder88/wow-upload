# apps/backend/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Prisma Client im Build erzeugen
RUN npx prisma generate

# Nest build
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Prisma CLI muss im runtime verfügbar sein (für generate + migrate)
RUN npm install prisma --no-save

# copy built app + prisma schema
COPY --from=deps /app/dist ./dist
COPY --from=deps /app/prisma ./prisma

# data dirs
RUN mkdir -p /app/uploads /app/data

EXPOSE 3000

# IMPORTANT: generate im runtime + migrate + start
CMD sh -c "npx prisma generate && npx prisma migrate deploy && node dist/src/main.js"
