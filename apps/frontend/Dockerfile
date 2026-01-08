# apps/frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime (nginx) ----
FROM nginx:alpine
# Angular output: bei neueren Angular Versionen meist dist/<project-name>/browser
# Wenn es bei dir anders heißt, gleich unten anpassen.
COPY --from=build /app/dist /usr/share/nginx/html

# simple nginx config (SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
