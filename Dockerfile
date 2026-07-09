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
CMD ["node", "dist/src/main"]
