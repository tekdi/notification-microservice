# Stage 1 — compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — lean production image (no devDependencies, no source)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/main"]
