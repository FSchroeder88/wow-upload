# apps/backend/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Prisma CLI für migrate deploy
RUN npm install prisma --no-save

COPY --from=deps /app/dist ./dist
COPY --from=deps /app/prisma ./prisma

# data dirs
RUN mkdir -p /app/uploads /app/data

EXPOSE 3000
CMD sh -c "npx prisma migrate deploy && node dist/main.js"
