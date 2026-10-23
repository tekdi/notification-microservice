FROM node:22.23.4-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --force
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
