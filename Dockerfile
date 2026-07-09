FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --force
COPY . .
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --force --omit=dev && npm install fcm-node --force
COPY --from=build /app/dist ./dist
EXPOSE 4000
# synchronize is false (see data-source.ts) — tables only exist once migrations run.
# Run pending migrations against the compiled data source before starting the app.
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/data-source.js && node dist/src/main"]
