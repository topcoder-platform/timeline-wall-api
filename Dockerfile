ARG NODE_VERSION=26.12.1
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /timeline-wall-api
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test && npm prune --omit=dev

FROM alpine:3.24 AS production
ARG NODE_VERSION
ENV NODE_ENV=production
WORKDIR /timeline-wall-api
RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates "nodejs-current~${NODE_VERSION%%.*}" \
    && addgroup -S -g 10001 app \
    && adduser -S -D -u 10001 -G app -h /home/app app
COPY --from=build --chown=app:app /timeline-wall-api/package.json /timeline-wall-api/package-lock.json ./
COPY --from=build --chown=app:app /timeline-wall-api/node_modules ./node_modules
COPY --from=build --chown=app:app /timeline-wall-api/src ./src
COPY --from=build --chown=app:app /timeline-wall-api/app.js /timeline-wall-api/config.js /timeline-wall-api/constants.js /timeline-wall-api/routes-bootstrap.js ./
USER app
EXPOSE 3001
CMD ["node", "app.js"]
