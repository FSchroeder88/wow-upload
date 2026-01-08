# apps/backend/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci

# copy source
COPY . .

# generate prisma client (optional, but good)
RUN npx prisma generate

# build nest
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# copy built app + prisma
COPY --from=deps /app/dist ./dist
COPY --from=deps /app/prisma ./prisma

# uploads directory inside container (will be mounted)
RUN mkdir -p /app/uploads

EXPOSE 3000

# run migrations on container start, then start server
CMD sh -c "npx prisma migrate deploy && node dist/main.js"
