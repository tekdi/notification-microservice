FROM node:22.23.4-alpine as dependencies
WORKDIR /app
COPY . ./
RUN npm i --force
RUN npm install fcm-node --force
RUN apt-get update 
EXPOSE 4000
CMD ["npm", "start"]
