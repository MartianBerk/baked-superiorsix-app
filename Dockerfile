FROM node:22-alpine AS build

WORKDIR /app

ARG EXPO_PUBLIC_AUTH_URL=/auth
ARG EXPO_PUBLIC_USER_URL=/user
ARG EXPO_PUBLIC_SUPERSIX_URL=/superiorsix
ARG EXPO_BASE_URL=/super

ENV EXPO_PUBLIC_AUTH_URL=$EXPO_PUBLIC_AUTH_URL
ENV EXPO_PUBLIC_USER_URL=$EXPO_PUBLIC_USER_URL
ENV EXPO_PUBLIC_SUPERSIX_URL=$EXPO_PUBLIC_SUPERSIX_URL
ENV EXPO_BASE_URL=$EXPO_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY app.json app.config.js tsconfig.json index.js ./
COPY app ./app
COPY assets ./assets
COPY src ./src
RUN npx expo export --platform web

FROM nginx:1.27-alpine

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD wget -qO- http://127.0.0.1/health || exit 1
