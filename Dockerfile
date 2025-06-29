# Build stage
FROM node:20-slim AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

COPY . .
ARG TMDB_V3_API_KEY
ENV VITE_APP_TMDB_V3_API_KEY=${TMDB_V3_API_KEY}
ENV VITE_APP_API_ENDPOINT_URL="https://api.themoviedb.org/3"
RUN yarn build

# NGINX stage
FROM nginx:stable-alpine

# Use non-root user for better security (optional but recommended)
# nginx user has UID 101 by default in Alpine
USER 101

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

COPY --from=builder /app/dist .

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
